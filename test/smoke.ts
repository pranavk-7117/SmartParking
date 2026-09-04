import { PrismaClient, SessionStatus, VehicleType, SlotStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function runSmokeTests() {
  console.log('🧪 Starting Smoke Tests...\n');

  try {
    // -------------------------------------------------------------
    // Test 1: Relational query vehicle -> session -> bill chain
    // -------------------------------------------------------------
    console.log('▶ Test 1: Query vehicle -> session -> bill chain with single Prisma `include` query...');
    const vehicleWithHistory = await prisma.vehicle.findUnique({
      where: { vehicleNumber: 'KA-01-AB-1234' },
      include: {
        sessions: {
          include: {
            slot: true,
            bill: true,
          },
        },
      },
    });

    if (!vehicleWithHistory) {
      throw new Error('Vehicle KA-01-AB-1234 not found.');
    }

    console.log(`  Found vehicle: ${vehicleWithHistory.vehicleNumber} (${vehicleWithHistory.vehicleType})`);
    console.log(`  Total sessions: ${vehicleWithHistory.sessions.length}`);
    for (const s of vehicleWithHistory.sessions) {
      console.log(`    - Session ID: ${s.id}, Slot: ${s.slot.locationCode}, Status: ${s.status}`);
      if (s.bill) {
        console.log(`      Bill: Amount: ₹${s.bill.amount}, Duration: ${s.bill.durationMinutes} mins, Rate: ₹${s.bill.rateApplied}/hr`);
      }
    }
    console.log('✅ Test 1 PASSED: Relational chain query succeeded.\n');

    // -------------------------------------------------------------
    // Test 2: Inserting a second ACTIVE session for the same vehicle fails
    // -------------------------------------------------------------
    console.log('▶ Test 2: Enforce at most one ACTIVE session per vehicle (partial unique index)...');
    
    // Find or create a test vehicle and slots for testing
    const testCar = await prisma.vehicle.upsert({
      where: { vehicleNumber: 'TEST-CAR-01' },
      update: {},
      create: {
        vehicleNumber: 'TEST-CAR-01',
        vehicleType: VehicleType.CAR,
      },
    });

    const slot1 = await prisma.slot.upsert({
      where: { locationCode: 'T-01' },
      update: {},
      create: {
        locationCode: 'T-01',
        slotType: VehicleType.CAR,
        status: SlotStatus.VACANT,
      },
    });

    const slot2 = await prisma.slot.upsert({
      where: { locationCode: 'T-02' },
      update: {},
      create: {
        locationCode: 'T-02',
        slotType: VehicleType.CAR,
        status: SlotStatus.VACANT,
      },
    });

    // Clean any prior test active sessions
    await prisma.parkingSession.deleteMany({
      where: {
        vehicleId: testCar.id,
      },
    });

    // Create 1st ACTIVE session for testCar -> should succeed
    const firstActive = await prisma.parkingSession.create({
      data: {
        vehicleId: testCar.id,
        slotId: slot1.id,
        inTime: new Date(),
        status: SessionStatus.ACTIVE,
      },
    });
    console.log(`  Created 1st ACTIVE session (${firstActive.id}) for vehicle ${testCar.vehicleNumber}.`);

    // Try to create 2nd ACTIVE session for same testCar -> should fail due to unique_active_vehicle_session
    let duplicateVehicleErrorCaught = false;
    try {
      await prisma.parkingSession.create({
        data: {
          vehicleId: testCar.id,
          slotId: slot2.id,
          inTime: new Date(),
          status: SessionStatus.ACTIVE,
        },
      });
    } catch (error: any) {
      duplicateVehicleErrorCaught = true;
      console.log('  Expected error caught:', error.message.split('\n').pop());
    }

    if (!duplicateVehicleErrorCaught) {
      throw new Error('FAIL: Database allowed duplicate ACTIVE sessions for the same vehicle!');
    }
    console.log('✅ Test 2 PASSED: Prevented second ACTIVE session for the same vehicle.\n');

    // -------------------------------------------------------------
    // Test 3: Enforce at most one ACTIVE session per slot (no double-booking)
    // -------------------------------------------------------------
    console.log('▶ Test 3: Enforce at most one ACTIVE session per slot (partial unique index)...');
    const testCar2 = await prisma.vehicle.upsert({
      where: { vehicleNumber: 'TEST-CAR-02' },
      update: {},
      create: {
        vehicleNumber: 'TEST-CAR-02',
        vehicleType: VehicleType.CAR,
      },
    });

    let doubleBookingErrorCaught = false;
    try {
      // Slot 1 already has firstActive session
      await prisma.parkingSession.create({
        data: {
          vehicleId: testCar2.id,
          slotId: slot1.id,
          inTime: new Date(),
          status: SessionStatus.ACTIVE,
        },
      });
    } catch (error: any) {
      doubleBookingErrorCaught = true;
      console.log('  Expected error caught:', error.message.split('\n').pop());
    }

    if (!doubleBookingErrorCaught) {
      throw new Error('FAIL: Database allowed double booking on slot T-01!');
    }
    console.log('✅ Test 3 PASSED: Prevented slot double-booking.\n');

    // -------------------------------------------------------------
    // Test 4: Inserting out_time earlier than in_time fails (CHECK constraint)
    // -------------------------------------------------------------
    console.log('▶ Test 4: Enforce CHECK (out_time IS NULL OR out_time > in_time)...');
    let checkConstraintErrorCaught = false;
    try {
      await prisma.parkingSession.create({
        data: {
          vehicleId: testCar2.id,
          slotId: slot2.id,
          inTime: new Date('2026-09-04T12:00:00.000Z'),
          outTime: new Date('2026-09-04T10:00:00.000Z'), // out_time < in_time (invalid!)
          status: SessionStatus.COMPLETED,
        },
      });
    } catch (error: any) {
      checkConstraintErrorCaught = true;
      console.log('  Expected error caught:', error.message.split('\n').pop());
    }

    if (!checkConstraintErrorCaught) {
      throw new Error('FAIL: Database allowed out_time earlier than in_time!');
    }
    console.log('✅ Test 4 PASSED: Prevented invalid out_time earlier than in_time.\n');

    // Clean up test data
    await prisma.parkingSession.deleteMany({
      where: {
        OR: [{ vehicleId: testCar.id }, { vehicleId: testCar2.id }],
      },
    });
    await prisma.vehicle.deleteMany({
      where: {
        vehicleNumber: { in: ['TEST-CAR-01', 'TEST-CAR-02'] },
      },
    });
    await prisma.slot.deleteMany({
      where: {
        locationCode: { in: ['T-01', 'T-02'] },
      },
    });

    console.log('🎉 All Smoke Tests Passed Successfully!\n');
  } catch (err) {
    console.error('❌ Smoke Test Failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runSmokeTests();
