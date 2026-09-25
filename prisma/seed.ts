import { PrismaClient, VehicleType, SlotStatus, SessionStatus, AdminRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting full real database seeding for Smart Parking System...');

  // ── 1. SITES / LOCATIONS ──────────────────────────────────────────────────
  const sitesData = [
    {
      code: 'site-hadapsar',
      name: 'AeroPark – Hadapsar',
      city: 'Pune',
      address: 'Plot 42, Magarpatta Road, Hadapsar Industrial Estate, Pune, Maharashtra 411028',
      gateInfo: 'Terminal 2 • Gates 1 & 2 (North Entry)',
      totalCarSlots: 40,
      totalScooterSlots: 20,
      defaultCarRate: 30.0,
      defaultScooterRate: 15.0,
      status: 'Active',
    },
    {
      code: 'site-camp',
      name: 'AeroPark – Camp',
      city: 'Pune',
      address: '14/B East Street, Near Wonderland, Camp, Pune, Maharashtra 411001',
      gateInfo: 'Main Plaza Gate • ANPR Lane 1 & 2',
      totalCarSlots: 30,
      totalScooterSlots: 15,
      defaultCarRate: 40.0,
      defaultScooterRate: 20.0,
      status: 'Active',
    },
    {
      code: 'site-kothrud',
      name: 'AeroPark – Kothrud',
      city: 'Pune',
      address: 'Paud Road, Ideal Colony, Kothrud, Pune, Maharashtra 411038',
      gateInfo: 'Phase 1 Construction Gates',
      totalCarSlots: 50,
      totalScooterSlots: 25,
      defaultCarRate: 30.0,
      defaultScooterRate: 15.0,
      status: 'Coming Soon',
    },
  ];

  const siteMap = new Map<string, string>(); // code -> id

  for (const s of sitesData) {
    const loc = await prisma.location.upsert({
      where: { code: s.code },
      update: s,
      create: s,
    });
    siteMap.set(s.code, loc.id);
  }
  console.log(`✅ Seeded ${siteMap.size} physical parking sites.`);

  const hadapsarId = siteMap.get('site-hadapsar')!;
  const campId = siteMap.get('site-camp')!;

  const kothrudId = siteMap.get('site-kothrud')!;

  // ── 2. SITE-SPECIFIC TARIFFS (RateMaster) ─────────────────────────────────
  const ratesToSeed = [
    { locationId: hadapsarId, vehicleType: VehicleType.CAR, ratePerHour: 30.0, effectiveFrom: new Date('2026-01-01'), lastUpdatedBy: 'Rajesh Sharma (Admin)' },
    { locationId: hadapsarId, vehicleType: VehicleType.SCOOTER, ratePerHour: 15.0, effectiveFrom: new Date('2026-01-01'), lastUpdatedBy: 'Rajesh Sharma (Admin)' },
    { locationId: campId, vehicleType: VehicleType.CAR, ratePerHour: 40.0, effectiveFrom: new Date('2026-01-01'), lastUpdatedBy: 'Rajesh Sharma (Admin)' },
    { locationId: campId, vehicleType: VehicleType.SCOOTER, ratePerHour: 20.0, effectiveFrom: new Date('2026-01-01'), lastUpdatedBy: 'Rajesh Sharma (Admin)' },
    { locationId: kothrudId, vehicleType: VehicleType.CAR, ratePerHour: 30.0, effectiveFrom: new Date('2026-01-01'), lastUpdatedBy: 'Rajesh Sharma (Admin)' },
    { locationId: kothrudId, vehicleType: VehicleType.SCOOTER, ratePerHour: 15.0, effectiveFrom: new Date('2026-01-01'), lastUpdatedBy: 'Rajesh Sharma (Admin)' },
  ];

  for (const r of ratesToSeed) {
    await prisma.rateMaster.upsert({
      where: {
        locationId_vehicleType: {
          locationId: r.locationId,
          vehicleType: r.vehicleType,
        },
      },
      update: r,
      create: r,
    });
  }
  console.log('✅ Seeded site-specific tariff masters.');

  // Rate History Audit Trail
  await prisma.rateHistory.deleteMany(); // clean refresh
  await prisma.rateHistory.createMany({
    data: [
      {
        locationId: hadapsarId,
        vehicleType: VehicleType.CAR,
        oldRate: 25.0,
        newRate: 30.0,
        changedBy: 'Rajesh Sharma',
        createdAt: new Date('2026-09-01T10:30:00Z'),
      },
      {
        locationId: hadapsarId,
        vehicleType: VehicleType.SCOOTER,
        oldRate: 10.0,
        newRate: 15.0,
        changedBy: 'Rajesh Sharma',
        createdAt: new Date('2026-08-25T16:15:00Z'),
      },
      {
        locationId: campId,
        vehicleType: VehicleType.CAR,
        oldRate: 35.0,
        newRate: 40.0,
        changedBy: 'Rajesh Sharma',
        createdAt: new Date('2026-09-02T11:00:00Z'),
      },
    ],
  });
  console.log('✅ Seeded rate history audit trail.');

  // ── 3. PARKING SLOTS ──────────────────────────────────────────────────────
  // Hadapsar: 40 Car slots (C-01 .. C-40), 20 Scooter slots (S-01 .. S-20)
  const slotRecords: Array<{
    locationId: string;
    locationCode: string;
    slotType: VehicleType;
    status: SlotStatus;
    deactivationReason?: string;
    deactivatedBy?: string;
    deactivatedAt?: Date;
  }> = [];

  for (let i = 1; i <= 40; i++) {
    const code = `C-${i.toString().padStart(2, '0')}`;
    const isDeact = code === 'C-08';
    slotRecords.push({
      locationId: hadapsarId,
      locationCode: code,
      slotType: VehicleType.CAR,
      status: isDeact ? SlotStatus.OUT_OF_SERVICE : SlotStatus.VACANT,
      deactivationReason: isDeact ? 'Surface oil leak maintenance and bay repaint' : undefined,
      deactivatedBy: isDeact ? 'Rajesh Sharma' : undefined,
      deactivatedAt: isDeact ? new Date('2026-09-03T14:30:00Z') : undefined,
    });
  }

  for (let i = 1; i <= 20; i++) {
    const code = `S-${i.toString().padStart(2, '0')}`;
    slotRecords.push({
      locationId: hadapsarId,
      locationCode: code,
      slotType: VehicleType.SCOOTER,
      status: SlotStatus.VACANT,
    });
  }

  // Camp: 30 Car slots (C-01 .. C-30), 15 Scooter slots (S-01 .. S-15)
  for (let i = 1; i <= 30; i++) {
    const code = `C-${i.toString().padStart(2, '0')}`;
    slotRecords.push({
      locationId: campId,
      locationCode: code,
      slotType: VehicleType.CAR,
      status: SlotStatus.VACANT,
    });
  }

  for (let i = 1; i <= 15; i++) {
    const code = `S-${i.toString().padStart(2, '0')}`;
    slotRecords.push({
      locationId: campId,
      locationCode: code,
      slotType: VehicleType.SCOOTER,
      status: SlotStatus.VACANT,
    });
  }

  const createdSlotMap = new Map<string, string>(); // `locationId:code` -> slotId

  for (const s of slotRecords) {
    const created = await prisma.slot.upsert({
      where: {
        locationId_locationCode: {
          locationId: s.locationId,
          locationCode: s.locationCode,
        },
      },
      update: s,
      create: s,
    });
    createdSlotMap.set(`${s.locationId}:${s.locationCode}`, created.id);
  }
  console.log(`✅ Seeded ${slotRecords.length} physical parking bays across sites.`);

  // Deactivation Events
  await prisma.slotDeactivationEvent.deleteMany();
  const slotC08Id = createdSlotMap.get(`${hadapsarId}:C-08`);
  if (slotC08Id) {
    await prisma.slotDeactivationEvent.create({
      data: {
        slotId: slotC08Id,
        locationId: hadapsarId,
        action: 'deactivate',
        reason: 'Surface oil leak maintenance and bay repaint',
        actionedBy: 'Rajesh Sharma',
        actionedAt: new Date('2026-09-03T14:30:00Z'),
      },
    });
  }

  // ── 4. USERS (Admin & Operators) ──────────────────────────────────────────
  const saltRounds = 10;
  const adminHash = await bcrypt.hash('admin123', saltRounds);
  const operatorHash = await bcrypt.hash('Operator@123', saltRounds);

  // 1. Rajesh Sharma (Primary Admin)
  const rajeshAdmin = await prisma.adminUser.upsert({
    where: { username: 'rajesh.admin' },
    update: {
      name: 'Rajesh Sharma',
      passwordHash: adminHash,
      role: AdminRole.ADMIN,
      status: 'Active',
      authMethod: 'Password',
      locationId: hadapsarId,
    },
    create: {
      username: 'rajesh.admin',
      name: 'Rajesh Sharma',
      passwordHash: adminHash,
      role: AdminRole.ADMIN,
      status: 'Active',
      authMethod: 'Password',
      locationId: hadapsarId,
    },
  });

  // 2. Default System Admin
  await prisma.adminUser.upsert({
    where: { username: 'admin' },
    update: {
      name: 'System Administrator',
      passwordHash: await bcrypt.hash('Admin@12345', saltRounds),
      role: AdminRole.ADMIN,
      status: 'Active',
      locationId: hadapsarId,
    },
    create: {
      username: 'admin',
      name: 'System Administrator',
      passwordHash: await bcrypt.hash('Admin@12345', saltRounds),
      role: AdminRole.ADMIN,
      status: 'Active',
      locationId: hadapsarId,
    },
  });

  // Operators
  const op1 = await prisma.adminUser.upsert({
    where: { username: 'suresh.patil' },
    update: {
      name: 'Suresh Patil',
      contact: '+91 98230 11234',
      passwordHash: operatorHash,
      role: AdminRole.OPERATOR,
      status: 'Active',
      authMethod: 'Google Account Linked',
      sessionsProcessedCount: 1420,
      locationId: hadapsarId,
    },
    create: {
      username: 'suresh.patil',
      name: 'Suresh Patil',
      contact: '+91 98230 11234',
      passwordHash: operatorHash,
      role: AdminRole.OPERATOR,
      status: 'Active',
      authMethod: 'Google Account Linked',
      sessionsProcessedCount: 1420,
      locationId: hadapsarId,
    },
  });

  await prisma.adminUser.upsert({
    where: { username: 'amit.deshmukh' },
    update: {
      name: 'Amit Deshmukh',
      contact: '+91 98450 88721',
      passwordHash: operatorHash,
      role: AdminRole.OPERATOR,
      status: 'Active',
      authMethod: 'Google Account Linked',
      sessionsProcessedCount: 980,
      locationId: hadapsarId,
    },
    create: {
      username: 'amit.deshmukh',
      name: 'Amit Deshmukh',
      contact: '+91 98450 88721',
      passwordHash: operatorHash,
      role: AdminRole.OPERATOR,
      status: 'Active',
      authMethod: 'Google Account Linked',
      sessionsProcessedCount: 980,
      locationId: hadapsarId,
    },
  });

  const op3 = await prisma.adminUser.upsert({
    where: { username: 'pooja.kulkarni' },
    update: {
      name: 'Pooja Kulkarni',
      contact: '+91 97632 44109',
      passwordHash: operatorHash,
      role: AdminRole.OPERATOR,
      status: 'Active',
      authMethod: 'Google Account Linked',
      sessionsProcessedCount: 1150,
      locationId: campId,
    },
    create: {
      username: 'pooja.kulkarni',
      name: 'Pooja Kulkarni',
      contact: '+91 97632 44109',
      passwordHash: operatorHash,
      role: AdminRole.OPERATOR,
      status: 'Active',
      authMethod: 'Google Account Linked',
      sessionsProcessedCount: 1150,
      locationId: campId,
    },
  });

  await prisma.adminUser.upsert({
    where: { username: 'vikas.shinde' },
    update: {
      name: 'Vikas Shinde',
      contact: '+91 99220 55432',
      passwordHash: operatorHash,
      role: AdminRole.OPERATOR,
      status: 'Terminated',
      authMethod: 'Google Account Linked',
      sessionsProcessedCount: 420,
      locationId: campId,
    },
    create: {
      username: 'vikas.shinde',
      name: 'Vikas Shinde',
      contact: '+91 99220 55432',
      passwordHash: operatorHash,
      role: AdminRole.OPERATOR,
      status: 'Terminated',
      authMethod: 'Google Account Linked',
      sessionsProcessedCount: 420,
      locationId: campId,
    },
  });
  console.log('✅ Seeded admin and operator user accounts.');

  // Operator Reassignment History
  await prisma.operatorReassignment.deleteMany();
  await prisma.operatorReassignment.createMany({
    data: [
      {
        operatorId: op1.id,
        fromLocationId: campId,
        toLocationId: hadapsarId,
        reassignedBy: 'Rajesh Sharma',
        reason: 'Shift rotation to cover North gate expansion',
        reassignedAt: new Date('2026-08-01T10:00:00Z'),
      },
      {
        operatorId: op3.id,
        fromLocationId: hadapsarId,
        toLocationId: campId,
        reassignedBy: 'Rajesh Sharma',
        reason: 'Requested transfer closer to residence',
        reassignedAt: new Date('2026-07-15T09:30:00Z'),
      },
    ],
  });
  console.log('✅ Seeded operator reassignment audit logs.');

  // ── 5. REAL VEHICLES, ACTIVE & COMPLETED SESSIONS ─────────────────────────
  const sampleVehicles = [
    { number: 'MH12AB1002', type: VehicleType.CAR },
    { number: 'MH12DE3456', type: VehicleType.CAR },
    { number: 'MH12GH7890', type: VehicleType.SCOOTER },
    { number: 'MH14JK1234', type: VehicleType.CAR },
    { number: 'MH12LM5678', type: VehicleType.SCOOTER },
    { number: 'KA01MN9012', type: VehicleType.CAR },
    { number: 'MH12PQ3456', type: VehicleType.CAR },
  ];

  const vehicleMap = new Map<string, string>();
  for (const v of sampleVehicles) {
    const rec = await prisma.vehicle.upsert({
      where: { vehicleNumber: v.number },
      update: { vehicleType: v.type },
      create: { vehicleNumber: v.number, vehicleType: v.type },
    });
    vehicleMap.set(v.number, rec.id);
  }

  // Active Sessions in Hadapsar
  const activeSlot1Id = createdSlotMap.get(`${hadapsarId}:C-02`)!;
  const activeSlot2Id = createdSlotMap.get(`${hadapsarId}:C-05`)!;
  const activeSlot3Id = createdSlotMap.get(`${hadapsarId}:S-02`)!;

  // Mark those slots occupied
  await prisma.slot.update({ where: { id: activeSlot1Id }, data: { status: SlotStatus.OCCUPIED } });
  await prisma.slot.update({ where: { id: activeSlot2Id }, data: { status: SlotStatus.OCCUPIED } });
  await prisma.slot.update({ where: { id: activeSlot3Id }, data: { status: SlotStatus.OCCUPIED } });

  // Clean old sessions for clean start
  await prisma.bill.deleteMany();
  await prisma.parkingSession.deleteMany();

  const now = new Date();
  const session1 = await prisma.parkingSession.create({
    data: {
      vehicleId: vehicleMap.get('MH12AB1002')!,
      slotId: activeSlot1Id,
      inTime: new Date(now.getTime() - 95 * 60 * 1000), // 95 mins ago
      status: SessionStatus.ACTIVE,
    },
  });

  const session2 = await prisma.parkingSession.create({
    data: {
      vehicleId: vehicleMap.get('MH12DE3456')!,
      slotId: activeSlot2Id,
      inTime: new Date(now.getTime() - 40 * 60 * 1000), // 40 mins ago
      status: SessionStatus.ACTIVE,
    },
  });

  const session3 = await prisma.parkingSession.create({
    data: {
      vehicleId: vehicleMap.get('MH12GH7890')!,
      slotId: activeSlot3Id,
      inTime: new Date(now.getTime() - 25 * 60 * 1000), // 25 mins ago
      status: SessionStatus.ACTIVE,
    },
  });

  // Completed Sessions with Bills
  const completedSlot1Id = createdSlotMap.get(`${hadapsarId}:C-03`)!;
  const compIn1 = new Date(now.getTime() - 240 * 60 * 1000);
  const compOut1 = new Date(now.getTime() - 90 * 60 * 1000);
  const compSession1 = await prisma.parkingSession.create({
    data: {
      vehicleId: vehicleMap.get('MH14JK1234')!,
      slotId: completedSlot1Id,
      inTime: compIn1,
      outTime: compOut1,
      status: SessionStatus.COMPLETED,
    },
  });
  await prisma.bill.create({
    data: {
      sessionId: compSession1.id,
      durationMinutes: 150,
      rateApplied: 30.0,
      amount: 75.0, // (150/60) * 30
      generatedOn: compOut1,
    },
  });

  const completedSlot2Id = createdSlotMap.get(`${hadapsarId}:S-04`)!;
  const compIn2 = new Date(now.getTime() - 180 * 60 * 1000);
  const compOut2 = new Date(now.getTime() - 60 * 60 * 1000);
  const compSession2 = await prisma.parkingSession.create({
    data: {
      vehicleId: vehicleMap.get('MH12LM5678')!,
      slotId: completedSlot2Id,
      inTime: compIn2,
      outTime: compOut2,
      status: SessionStatus.COMPLETED,
    },
  });
  await prisma.bill.create({
    data: {
      sessionId: compSession2.id,
      durationMinutes: 120,
      rateApplied: 15.0,
      amount: 30.0, // (120/60) * 15
      generatedOn: compOut2,
    },
  });

  console.log('✅ Seeded real active & completed parking transactions with bills.');

  console.log('\n🎉 Comprehensive database seeding completed successfully!');
  console.log('   Admin Login: username="rajesh.admin", password="admin123"');
  console.log('   System Admin: username="admin", password="Admin@12345"');
  console.log('   Operators: password="Operator@123"');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
