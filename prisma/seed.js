const { PrismaClient, VehicleType, SlotStatus, AdminRole } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting ParkIT database seeding...');

  // ── 1. SITE ──────────────────────────────────────────────────────────────────
  const siteData = {
    code: 'site-camp',
    name: 'ParkIT – Camp',
    city: process.env.SITE_CITY || 'Pune',
    address: process.env.SITE_ADDRESS || 'Camp Area, Pune, Maharashtra',
    gateInfo: process.env.SITE_GATE_INFO || 'Main Entrance Gate',
    totalCarSlots: parseInt(process.env.SITE_CAR_SLOTS || '30', 10),
    totalScooterSlots: parseInt(process.env.SITE_SCOOTER_SLOTS || '15', 10),
    defaultCarRate: parseFloat(process.env.SITE_CAR_RATE || '40'),
    defaultScooterRate: parseFloat(process.env.SITE_SCOOTER_RATE || '20'),
    status: 'Active',
  };

  const site = await prisma.location.upsert({
    where: { code: siteData.code },
    update: siteData,
    create: siteData,
  });
  console.log(`✅ Seeded site: ${site.name}`);

  // ── 2. RATES ─────────────────────────────────────────────────────────────────
  await prisma.rateMaster.upsert({
    where: { locationId_vehicleType: { locationId: site.id, vehicleType: VehicleType.CAR } },
    update: { ratePerHour: siteData.defaultCarRate, effectiveFrom: new Date(), lastUpdatedBy: 'system' },
    create: { locationId: site.id, vehicleType: VehicleType.CAR, ratePerHour: siteData.defaultCarRate, effectiveFrom: new Date(), lastUpdatedBy: 'system' },
  });
  await prisma.rateMaster.upsert({
    where: { locationId_vehicleType: { locationId: site.id, vehicleType: VehicleType.SCOOTER } },
    update: { ratePerHour: siteData.defaultScooterRate, effectiveFrom: new Date(), lastUpdatedBy: 'system' },
    create: { locationId: site.id, vehicleType: VehicleType.SCOOTER, ratePerHour: siteData.defaultScooterRate, effectiveFrom: new Date(), lastUpdatedBy: 'system' },
  });
  console.log('✅ Seeded tariff rates.');

  // ── 3. PARKING SLOTS ─────────────────────────────────────────────────────────
  const carCount = siteData.totalCarSlots;
  const scooterCount = siteData.totalScooterSlots;

  for (let i = 1; i <= carCount; i++) {
    const code = `C-${i.toString().padStart(2, '0')}`;
    await prisma.slot.upsert({
      where: { locationId_locationCode: { locationId: site.id, locationCode: code } },
      update: { slotType: VehicleType.CAR, status: SlotStatus.VACANT },
      create: { locationId: site.id, locationCode: code, slotType: VehicleType.CAR, status: SlotStatus.VACANT },
    });
  }
  for (let i = 1; i <= scooterCount; i++) {
    const code = `S-${i.toString().padStart(2, '0')}`;
    await prisma.slot.upsert({
      where: { locationId_locationCode: { locationId: site.id, locationCode: code } },
      update: { slotType: VehicleType.SCOOTER, status: SlotStatus.VACANT },
      create: { locationId: site.id, locationCode: code, slotType: VehicleType.SCOOTER, status: SlotStatus.VACANT },
    });
  }
  console.log(`✅ Seeded ${carCount} car slots and ${scooterCount} scooter slots.`);

  // ── 4. ADMIN ACCOUNT ─────────────────────────────────────────────────────────
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@ParkIT!2026';
  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
    console.warn('⚠️  ADMIN_USERNAME / ADMIN_PASSWORD env vars not set. Using defaults — set them in .env before production use!');
  }
  const adminHash = await bcrypt.hash(adminPassword, 12);
  await prisma.adminUser.upsert({
    where: { username: adminUsername },
    update: { passwordHash: adminHash, role: AdminRole.ADMIN, status: 'Active', locationId: site.id, tokenVersion: 1, mustChangePassword: false },
    create: {
      username: adminUsername,
      name: 'ParkIT Admin',
      passwordHash: adminHash,
      role: AdminRole.ADMIN,
      status: 'Active',
      authMethod: 'Password',
      locationId: site.id,
      tokenVersion: 1,
      mustChangePassword: false,
    },
  });
  console.log(`✅ Admin account ready: ${adminUsername}`);

  // ── 5. OPERATOR ACCOUNT ──────────────────────────────────────────────────────
  const operatorUsername = process.env.OPERATOR_USERNAME || 'operator';
  const operatorPassword = process.env.OPERATOR_PASSWORD || 'Operator@ParkIT!2026';
  if (!process.env.OPERATOR_USERNAME || !process.env.OPERATOR_PASSWORD) {
    console.warn('⚠️  OPERATOR_USERNAME / OPERATOR_PASSWORD env vars not set. Using defaults — set them in .env before production use!');
  }
  const operatorHash = await bcrypt.hash(operatorPassword, 12);
  await prisma.adminUser.upsert({
    where: { username: operatorUsername },
    update: { passwordHash: operatorHash, role: AdminRole.OPERATOR, status: 'Active', locationId: site.id, tokenVersion: 1, mustChangePassword: false },
    create: {
      username: operatorUsername,
      name: 'ParkIT Operator',
      passwordHash: operatorHash,
      role: AdminRole.OPERATOR,
      status: 'Active',
      authMethod: 'Password',
      locationId: site.id,
      tokenVersion: 1,
      mustChangePassword: false,
    },
  });
  console.log(`✅ Operator account ready: ${operatorUsername}`);

  console.log('🎉 ParkIT seeding complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
