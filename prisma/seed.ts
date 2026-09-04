import { PrismaClient, VehicleType, SlotStatus, SessionStatus, AdminRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Seed Rate Master (CAR and SCOOTER hourly rates)
  const rates = [
    {
      vehicleType: VehicleType.CAR,
      ratePerHour: 40.0,
      effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
    },
    {
      vehicleType: VehicleType.SCOOTER,
      ratePerHour: 20.0,
      effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
    },
  ];

  for (const rate of rates) {
    await prisma.rateMaster.upsert({
      where: { vehicleType: rate.vehicleType },
      update: {
        ratePerHour: rate.ratePerHour,
        effectiveFrom: rate.effectiveFrom,
      },
      create: rate,
    });
  }
  console.log('✅ Rate master seeded.');

  // 2. Seed Slots (10 slots: 5 CAR, 5 SCOOTER, all VACANT)
  const slotData = [
    { locationCode: 'C-01', slotType: VehicleType.CAR, status: SlotStatus.VACANT },
    { locationCode: 'C-02', slotType: VehicleType.CAR, status: SlotStatus.VACANT },
    { locationCode: 'C-03', slotType: VehicleType.CAR, status: SlotStatus.VACANT },
    { locationCode: 'C-04', slotType: VehicleType.CAR, status: SlotStatus.VACANT },
    { locationCode: 'C-05', slotType: VehicleType.CAR, status: SlotStatus.VACANT },
    { locationCode: 'S-01', slotType: VehicleType.SCOOTER, status: SlotStatus.VACANT },
    { locationCode: 'S-02', slotType: VehicleType.SCOOTER, status: SlotStatus.VACANT },
    { locationCode: 'S-03', slotType: VehicleType.SCOOTER, status: SlotStatus.VACANT },
    { locationCode: 'S-04', slotType: VehicleType.SCOOTER, status: SlotStatus.VACANT },
    { locationCode: 'S-05', slotType: VehicleType.SCOOTER, status: SlotStatus.VACANT },
  ];

  const createdSlots: Record<string, string> = {};
  for (const slot of slotData) {
    const record = await prisma.slot.upsert({
      where: { locationCode: slot.locationCode },
      update: {
        slotType: slot.slotType,
        status: slot.status,
      },
      create: slot,
    });
    createdSlots[slot.locationCode] = record.id;
  }
  console.log('✅ Slots seeded (10 slots: 5 CAR, 5 SCOOTER).');

  // 3. Seed Sample Vehicles (4 vehicles)
  const vehicleData = [
    { vehicleNumber: 'KA-01-AB-1234', vehicleType: VehicleType.CAR },
    { vehicleNumber: 'MH-12-CD-5678', vehicleType: VehicleType.CAR },
    { vehicleNumber: 'DL-04-EF-9012', vehicleType: VehicleType.SCOOTER },
    { vehicleNumber: 'TN-09-GH-3456', vehicleType: VehicleType.SCOOTER },
  ];

  const createdVehicles: Record<string, string> = {};
  for (const vehicle of vehicleData) {
    const record = await prisma.vehicle.upsert({
      where: { vehicleNumber: vehicle.vehicleNumber },
      update: {
        vehicleType: vehicle.vehicleType,
      },
      create: vehicle,
    });
    createdVehicles[vehicle.vehicleNumber] = record.id;
  }
  console.log('✅ Vehicles seeded (4 sample vehicles).');

  // 4. Seed Completed Parking Sessions with Bills (2 completed sessions)
  const session1Id = '00000000-0000-0000-0000-000000000001';
  const bill1Id = '00000000-0000-0000-0000-000000000101';
  const inTime1 = new Date('2026-09-04T08:00:00.000Z');
  const outTime1 = new Date('2026-09-04T10:30:00.000Z');

  await prisma.parkingSession.upsert({
    where: { id: session1Id },
    update: {
      vehicleId: createdVehicles['KA-01-AB-1234'],
      slotId: createdSlots['C-01'],
      inTime: inTime1,
      outTime: outTime1,
      status: SessionStatus.COMPLETED,
    },
    create: {
      id: session1Id,
      vehicleId: createdVehicles['KA-01-AB-1234'],
      slotId: createdSlots['C-01'],
      inTime: inTime1,
      outTime: outTime1,
      status: SessionStatus.COMPLETED,
    },
  });

  await prisma.bill.upsert({
    where: { sessionId: session1Id },
    update: {
      durationMinutes: 150,
      rateApplied: 40.0,
      amount: 120.0,
      generatedOn: outTime1,
    },
    create: {
      id: bill1Id,
      sessionId: session1Id,
      durationMinutes: 150,
      rateApplied: 40.0,
      amount: 120.0,
      generatedOn: outTime1,
    },
  });

  const session2Id = '00000000-0000-0000-0000-000000000002';
  const bill2Id = '00000000-0000-0000-0000-000000000102';
  const inTime2 = new Date('2026-09-04T09:00:00.000Z');
  const outTime2 = new Date('2026-09-04T11:00:00.000Z');

  await prisma.parkingSession.upsert({
    where: { id: session2Id },
    update: {
      vehicleId: createdVehicles['DL-04-EF-9012'],
      slotId: createdSlots['S-01'],
      inTime: inTime2,
      outTime: outTime2,
      status: SessionStatus.COMPLETED,
    },
    create: {
      id: session2Id,
      vehicleId: createdVehicles['DL-04-EF-9012'],
      slotId: createdSlots['S-01'],
      inTime: inTime2,
      outTime: outTime2,
      status: SessionStatus.COMPLETED,
    },
  });

  await prisma.bill.upsert({
    where: { sessionId: session2Id },
    update: {
      durationMinutes: 120,
      rateApplied: 20.0,
      amount: 40.0,
      generatedOn: outTime2,
    },
    create: {
      id: bill2Id,
      sessionId: session2Id,
      durationMinutes: 120,
      rateApplied: 20.0,
      amount: 40.0,
      generatedOn: outTime2,
    },
  });

  console.log('✅ Completed parking sessions with bills seeded.');

  // 5. Seed Admin User with bcrypt-hashed password
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash('Admin@12345', saltRounds);

  await prisma.adminUser.upsert({
    where: { username: 'admin' },
    update: {
      passwordHash,
      role: AdminRole.ADMIN,
    },
    create: {
      username: 'admin',
      passwordHash,
      role: AdminRole.ADMIN,
    },
  });
  console.log('✅ Admin user seeded (username: "admin").');

  console.log('🎉 Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
