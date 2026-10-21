import { PrismaClient, AdminRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting ParkIT clean Day-0 database initialization (Zero mock data)...');

  // ONLY provision the SuperAdmin account
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'change_me_admin_password';
  const adminHash = await bcrypt.hash(adminPassword, 12);

  await prisma.adminUser.upsert({
    where: { username: adminUsername },
    update: {
      passwordHash: adminHash,
      role: AdminRole.ADMIN,
      status: 'Active',
      locationId: null,
      tokenVersion: 1,
      mustChangePassword: false,
    },
    create: {
      username: adminUsername,
      name: 'ParkIT SuperAdmin',
      passwordHash: adminHash,
      role: AdminRole.ADMIN,
      status: 'Active',
      authMethod: 'Password',
      locationId: null,
      tokenVersion: 1,
      mustChangePassword: false,
    },
  });
  console.log(`✅ SuperAdmin account provisioned: ${adminUsername}`);
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
