import { PrismaClient, AdminRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Purging all pre-seeded mock sites, operators, slots, and sessions...');

  // 1. Remove all reassignments
  await prisma.operatorReassignment.deleteMany({});

  // 2. Remove all notifications
  await prisma.notification.deleteMany({});

  // 3. Remove all parking sessions & bills
  await prisma.bill.deleteMany({});
  await prisma.parkingSession.deleteMany({});

  // 4. Remove all slot deactivation events & slots
  await prisma.slotDeactivationEvent.deleteMany({});
  await prisma.slot.deleteMany({});

  // 5. Remove all rates and rate history
  await prisma.rateHistory.deleteMany({});
  await prisma.rateMaster.deleteMany({});

  // 6. Delete all operators (keeping only ADMIN users)
  await prisma.adminUser.deleteMany({
    where: {
      role: AdminRole.OPERATOR,
    },
  });

  // 7. Unlink any locationId from Admin users
  await prisma.adminUser.updateMany({
    data: {
      locationId: null,
    },
  });

  // 8. Delete all locations/sites
  await prisma.location.deleteMany({});

  // 9. Ensure SuperAdmin exists and is active with no assigned site
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

  const siteCount = await prisma.location.count();
  const opCount = await prisma.adminUser.count({ where: { role: AdminRole.OPERATOR } });
  const adminCount = await prisma.adminUser.count({ where: { role: AdminRole.ADMIN } });

  console.log(`✨ Database purged successfully!`);
  console.log(`- Sites in DB: ${siteCount}`);
  console.log(`- Operators in DB: ${opCount}`);
  console.log(`- Admin accounts in DB: ${adminCount}`);
}

main()
  .catch((e) => {
    console.error('Error purging data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
