'use strict';

/**
 * Unit tests for CalcomEventProcessor.
 *
 * The processor requires a db client — we inject a minimal stub so tests run
 * without a live database.
 */

const assert = require('assert');
const CalcomEventProcessor = require('../../lib/services/CalcomEventProcessor');

let passed = 0;
let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`  ❌ ${name}: ${error.message}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// Stub DB — returns empty/null results for all queries
// ---------------------------------------------------------------------------
function makeStubDb(overrides = {}) {
  const chain = {
    select: () => chain,
    insert: () => chain,
    upsert: () => chain,
    update: () => chain,
    eq: () => chain,
    maybeSingle: async () => ({ data: null, error: null }),
    single: async () => ({ data: null, error: null }),
    from: () => chain,
  };

  // Allow overrides to replace specific behaviour
  Object.assign(chain, overrides);

  return { from: () => chain };
}

async function run() {
  console.log('\n🧪 CalcomEventProcessor class tests\n');

  // -----------------------------------------------------------------------
  await check('constructor throws without db', async () => {
    let threw = false;
    try {
      new CalcomEventProcessor({});
    } catch (e) {
      threw = true;
      assert.ok(e.message.includes('requires a db client'), `unexpected message: ${e.message}`);
    }
    assert.ok(threw, 'expected constructor to throw');
  });

  // -----------------------------------------------------------------------
  await check('process returns received:true for unknown event', async () => {
    const db = makeStubDb();
    const processor = new CalcomEventProcessor({ db });
    const result = await processor.process({ triggerEvent: 'UNKNOWN_THING', payload: {} });
    assert.strictEqual(result.received, true);
    assert.strictEqual(result.type, 'UNKNOWN_THING');
  });

  // -----------------------------------------------------------------------
  await check('process dispatches BOOKING_CREATED without crashing (stub db)', async () => {
    // Upsert on 'bookings' must return a record with an id so downstream steps can proceed.
    let callCount = 0;
    const chain = {
      select: () => chain,
      insert: () => chain,
      update: () => chain,
      eq: () => chain,
      maybeSingle: async () => ({ data: null, error: null }),
      single: async () => {
        callCount++;
        // First single() call is the booking upsert — return a minimal booking record
        return { data: { id: 'booking-1', agent_id: null, start_time: new Date().toISOString() }, error: null };
      },
      upsert: () => chain,
      from: () => chain,
    };
    const db = { from: () => chain };

    const processor = new CalcomEventProcessor({
      db,
      createLeadSequence: async () => {},
      twilioService: { sendSms: async () => ({ sid: 'SM_test', status: 'queued' }) },
    });

    const booking = {
      id: 42,
      uid: 'test-uid-001',
      eventTypeId: 1,
      title: 'Test Booking',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      attendees: [{ name: 'Alice', email: 'alice@example.com' }],
    };

    const result = await processor.process({ triggerEvent: 'BOOKING_CREATED', payload: booking });
    assert.strictEqual(result.received, true);
    assert.strictEqual(result.type, 'BOOKING_CREATED');
  });

  // -----------------------------------------------------------------------
  await check('process dispatches BOOKING_CANCELLED without crashing (stub db)', async () => {
    const db = makeStubDb();
    const processor = new CalcomEventProcessor({
      db,
      createLeadSequence: async () => {},
    });

    const booking = {
      uid: 'cancel-uid-001',
      eventTypeId: 2,
      cancellationReason: 'Changed my mind',
      attendees: [{ name: 'Bob', email: 'bob@example.com' }],
    };

    const result = await processor.process({ triggerEvent: 'BOOKING_CANCELLED', payload: booking });
    assert.strictEqual(result.received, true);
    assert.strictEqual(result.type, 'BOOKING_CANCELLED');
  });

  // -----------------------------------------------------------------------
  await check('process dispatches MEETING_ENDED without crashing (stub db)', async () => {
    const db = makeStubDb();
    const processor = new CalcomEventProcessor({
      db,
      createLeadSequence: async () => {},
    });

    const booking = {
      uid: 'meeting-uid-001',
      eventTypeId: 3,
      attendees: [{ name: 'Carol', email: 'carol@example.com' }],
    };

    const result = await processor.process({ triggerEvent: 'MEETING_ENDED', payload: booking });
    assert.strictEqual(result.received, true);
    assert.strictEqual(result.type, 'MEETING_ENDED');
  });

  // -----------------------------------------------------------------------
  await check('process dispatches BOOKING_RESCHEDULED without crashing (stub db)', async () => {
    const db = makeStubDb();
    const processor = new CalcomEventProcessor({ db });

    const booking = {
      uid: 'reschedule-uid-001',
      eventTypeId: 4,
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      attendees: [{ name: 'Dave', email: 'dave@example.com' }],
    };

    const result = await processor.process({ triggerEvent: 'BOOKING_RESCHEDULED', payload: booking });
    assert.strictEqual(result.received, true);
    assert.strictEqual(result.type, 'BOOKING_RESCHEDULED');
  });

  // -----------------------------------------------------------------------
  await check('sendBookingConfirmationSMS skips when no phone', async () => {
    const db = makeStubDb();
    const processor = new CalcomEventProcessor({ db });
    // Should not throw — gracefully skips
    await processor.sendBookingConfirmationSMS({ name: 'Alice', phone: null, startTime: null });
  });

  // -----------------------------------------------------------------------
  await check('findOrCreateLead returns null when db insert returns no data', async () => {
    const db = makeStubDb();
    const processor = new CalcomEventProcessor({ db });
    // Pass the db client itself (not a chain) — method calls db.from(...)
    const result = await processor.findOrCreateLead({ name: 'Alice', email: 'alice@example.com' }, db);
    assert.strictEqual(result, null);
  });

  // -----------------------------------------------------------------------

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
