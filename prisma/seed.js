const { PrismaClient, AdminRole } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting ParkIT clean Day-0 database initialization (Zero mock data)...');

  // ONLY provision the SuperAdmin account if it does not already exist
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const existingAdmin = await prisma.adminUser.findUnique({
    where: { username: adminUsername },
  });

  if (existingAdmin) {
    console.log(`ℹ️ Admin account "${adminUsername}" already exists. Preserving existing password and credentials.`);
  } else {
    const adminInitialPassword = process.env.ADMIN_INITIAL_PASSWORD || process.env.ADMIN_PASSWORD || 'admin123';
    const adminHash = await bcrypt.hash(adminInitialPassword, 12);

    await prisma.adminUser.create({
      data: {
        username: adminUsername,
        name: 'ParkIT SuperAdmin',
        passwordHash: adminHash,
        role: AdminRole.ADMIN,
        status: 'Active',
        authMethod: 'Password',
        locationId: null,
        tokenVersion: 1,
        mustChangePassword: true, // Forces password change on initial login
      },
    });
    console.log(`✅ SuperAdmin account provisioned: ${adminUsername} (mustChangePassword: true)`);
  }

  console.log('🎉 Clean Day-0 database ready: 0 mock sites, 0 mock operators, 0 mock sessions.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
