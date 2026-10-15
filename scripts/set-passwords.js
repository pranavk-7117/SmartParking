#!/usr/bin/env node
/**
 * One-time script to set admin and operator passwords in the running database.
 * Run inside the backend container: node scripts/set-passwords.js
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const adminUser   = process.env.ADMIN_USERNAME   || 'admin';
  const adminPass   = process.env.ADMIN_PASSWORD   || 'admin123';
  const opUser      = process.env.OPERATOR_USERNAME || 'operator';
  const opPass      = process.env.OPERATOR_PASSWORD || 'operator123';

  const adminHash = await bcrypt.hash(adminPass, 12);
  const opHash    = await bcrypt.hash(opPass, 12);

  const adminResult = await prisma.adminUser.updateMany({
    where: { username: adminUser },
    data:  { passwordHash: adminHash, mustChangePassword: false },
  });
  console.log(`✅ Admin (${adminUser}) password updated — rows affected: ${adminResult.count}`);

  const opResult = await prisma.adminUser.updateMany({
    where: { username: opUser },
    data:  { passwordHash: opHash, mustChangePassword: false },
  });
  console.log(`✅ Operator (${opUser}) password updated — rows affected: ${opResult.count}`);

  await prisma.loginAttempt.deleteMany({});
  console.log('✅ Login attempt history cleared.');

  console.log('🎉 Passwords set successfully.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
