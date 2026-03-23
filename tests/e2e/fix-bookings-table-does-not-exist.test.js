/**
 * Tests for: fix-bookings-table-does-not-exist-booking-conversion-a
 * Task ID: 6fb5d561-751d-47a9-9e88-75f586f52c50
 * 
 * Verifies:
 * 1. bookings table exists in Supabase with correct schema
 * 2. Booking insert with all required fields works
 * 3. Analytics conversion query (getLeadConversion pattern) works
 * 4. Root webhook handler uses correct column names
 * 5. Dashboard webhook route uses correct column names
 */

const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

let passed = 0;
let failed = 0;
const insertedIds = [];

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failed++;
    return false;
  }
  console.log(`✅ PASS: ${message}`);
  passed++;
  return true;
}

async function testBookingsTableExists() {
  console.log('\n📋 Test Suite 1: bookings table exists with correct schema');

  const { data, error } = await supabase.from('bookings').select('*').limit(0);
  assert(!error, `bookings table is queryable (error was: ${error?.message})`);

  // Verify key columns exist by inserting a minimal row
  const now = new Date();
  const { data: row, error: insErr } = await supabase
    .from('bookings')
    .insert({
      calcom_booking_id: 'schema-test-999',
      cal_booking_uid: 'schema-test-uid-999',
      calcom_event_type_id: '1',
      start_time: new Date(now.getTime() + 3600000).toISOString(),
      end_time: new Date(now.getTime() + 7200000).toISOString(),
      status: 'confirmed',
    })
    .select()
    .single();

  assert(!insErr, `Insert with required columns succeeds (error: ${insErr?.message})`);
  if (row?.id) insertedIds.push(row.id);

  if (row) {
    assert(row.calcom_booking_id === 'schema-test-999', 'calcom_booking_id column exists');
    assert(row.cal_booking_uid === 'schema-test-uid-999', 'cal_booking_uid column exists');
    assert(row.calcom_event_type_id === '1', 'calcom_event_type_id column exists');
    assert(row.status === 'confirmed', 'status column exists with correct default');
    assert(row.lead_id === null, 'lead_id column exists (nullable)');
    assert(row.agent_id === null, 'agent_id column exists (nullable)');
    assert(row.created_at !== undefined, 'created_at timestamp column exists');
    assert(row.updated_at !== undefined, 'updated_at timestamp column exists');
    assert(row.metadata !== undefined, 'metadata JSONB column exists');
    assert(row.reschedule_count === 0, 'reschedule_count column exists with default 0');
  }
}

async function testBookingsInsertFullPayload() {
  console.log('\n📋 Test Suite 2: Full webhook payload insert');

  // Simulate dashboard webhook insert
  const { data: row, error } = await supabase
    .from('bookings')
    .insert({
      calcom_booking_id: '12345',
      calcom_event_type_id: '678',
      start_time: '2025-03-01T14:00:00Z',
      end_time: '2025-03-01T14:30:00Z',
      meeting_link: 'https://us06web.zoom.us/j/123456789',
      notes: 'Interested in 3-bed properties under $500k',
      metadata: {
        title: '30min Meeting with Agent',
        attendees: [{ email: 'buyer@example.com', name: 'John Buyer' }],
        organizer: { email: 'agent@realty.com', name: 'Jane Agent' },
        uid: 'abc123-xyz789',
      },
      lead_id: null,
      status: 'confirmed',
    })
    .select()
    .single();

  assert(!error, `Dashboard webhook payload inserts without error (${error?.message})`);
  if (row?.id) insertedIds.push(row.id);

  if (row) {
    assert(row.calcom_booking_id === '12345', 'calcom_booking_id stored correctly');
    assert(row.meeting_link === 'https://us06web.zoom.us/j/123456789', 'meeting_link stored correctly');
    assert(row.notes === 'Interested in 3-bed properties under $500k', 'notes stored correctly');
  }
}

async function testRootHandlerColumnNames() {
  console.log('\n📋 Test Suite 3: Root webhook handler uses correct column names');

  // Simulate root handler insert (lib/calcom-webhook-handler.js)
  const { data: row, error } = await supabase
    .from('bookings')
    .insert({
      calcom_booking_id: '99001',          // was cal_booking_id — FIXED
      cal_booking_uid: 'handler-uid-001',  // unique uid for upsert
      calcom_event_type_id: '200',         // was cal_event_type_id — FIXED
      attendee_email: 'root@example.com',
      attendee_name: 'Root Test',
      title: '30min Consultation',
      notes: 'Looking for investment properties',  // was description — FIXED
      start_time: '2025-03-02T10:00:00Z',
      end_time: '2025-03-02T10:30:00Z',
      status: 'confirmed',                 // was 'booked' — FIXED to match schema enum
      location: 'Virtual',
      meeting_link: 'https://zoom.us/j/111',  // was meeting_url — FIXED
      lead_id: null,
      agent_id: null,
      metadata: { cal_event_type_slug: 'consultation', source: 'cal.com' },
      source: 'cal.com',
    })
    .select()
    .single();

  assert(!error, `Root handler column names work correctly (${error?.message})`);
  if (row?.id) insertedIds.push(row.id);

  if (row) {
    assert(row.cal_booking_uid === 'handler-uid-001', 'cal_booking_uid stored for upsert dedup');
    assert(row.attendee_email === 'root@example.com', 'attendee_email stored');
    assert(row.meeting_link === 'https://zoom.us/j/111', 'meeting_link stored (was meeting_url)');
    assert(row.notes === 'Looking for investment properties', 'notes stored (was description)');
  }
}

async function testAnalyticsConversionQuery() {
  console.log('\n📋 Test Suite 4: Analytics conversion query works');

  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // This replicates the exact query in getLeadConversion()
  const { data: bookingsData, error: bookingsError } = await supabase
    .from('bookings')
    .select('lead_id')
    .gte('created_at', startDate);

  assert(!bookingsError, `Booking conversion query executes without error (${bookingsError?.message})`);
  assert(Array.isArray(bookingsData), 'Booking conversion query returns an array');

  // Verify lead_id column is accessible
  if (bookingsData && bookingsData.length > 0) {
    assert('lead_id' in bookingsData[0], 'lead_id column accessible in query result');
  }

  console.log(`   → Found ${bookingsData?.length || 0} bookings in last 30 days`);
}

async function testCancelledBookingUpdate() {
  console.log('\n📋 Test Suite 5: Booking status update (cancel/complete) works');

  // Insert a booking to cancel
  const { data: booking } = await supabase
    .from('bookings')
    .insert({
      calcom_booking_id: 'cancel-test-001',
      cal_booking_uid: 'cancel-uid-001',
      calcom_event_type_id: '1',
      start_time: '2025-03-05T09:00:00Z',
      end_time: '2025-03-05T09:30:00Z',
      status: 'confirmed',
    })
    .select()
    .single();

  if (booking?.id) insertedIds.push(booking.id);

  // Update to cancelled (as root handler does)
  const { data: cancelled, error: cancelErr } = await supabase
    .from('bookings')
    .update({
      status: 'cancelled',
      cancellation_reason: 'Test cancellation',
      cancelled_at: new Date().toISOString(),
    })
    .eq('cal_booking_uid', 'cancel-uid-001')
    .select()
    .single();

  assert(!cancelErr, `Cancel update works (${cancelErr?.message})`);
  if (cancelled) {
    assert(cancelled.status === 'cancelled', 'status updated to cancelled');
    assert(cancelled.cancellation_reason === 'Test cancellation', 'cancellation_reason stored');
    assert(cancelled.cancelled_at !== null, 'cancelled_at timestamp stored');
  }
}

async function testBookingsFileStructure() {
  console.log('\n📋 Test Suite 6: Migration file and code structure');

  const migrationPath = path.join(__dirname, '..', 'sql', 'migration-create-bookings-table.sql');
  assert(fs.existsSync(migrationPath), 'Migration SQL file exists');

  const migrationContent = fs.readFileSync(migrationPath, 'utf-8');
  assert(migrationContent.includes('calcom_booking_id'), 'Migration has calcom_booking_id column');
  assert(migrationContent.includes('cal_booking_uid'), 'Migration has cal_booking_uid UNIQUE column');
  assert(migrationContent.includes('lead_id'), 'Migration has lead_id column');
  assert(migrationContent.includes('meeting_link'), 'Migration has meeting_link column');

  // Check root handler uses correct column names
  const handlerPath = path.join(__dirname, '..', 'lib', 'calcom-webhook-handler.js');
  const handlerContent = fs.readFileSync(handlerPath, 'utf-8');
  assert(handlerContent.includes('calcom_booking_id:'), 'Root handler uses calcom_booking_id (not cal_booking_id)');
  assert(handlerContent.includes('calcom_event_type_id:'), 'Root handler uses calcom_event_type_id (not cal_event_type_id)');
  assert(handlerContent.includes('meeting_link:'), 'Root handler uses meeting_link (not meeting_url)');
  assert(handlerContent.includes('notes:'), 'Root handler uses notes (not description)');
  assert(!handlerContent.includes("cal_booking_id: booking.id"), 'Root handler does NOT use old cal_booking_id');

  // Check analytics query
  const analyticsPath = path.join(__dirname, '..', 'product', 'lead-response', 'dashboard', 'lib', 'analytics-queries.ts');
  const analyticsContent = fs.readFileSync(analyticsPath, 'utf-8');
  assert(analyticsContent.includes(".from('bookings')"), 'Analytics queries the bookings table');
  assert(analyticsContent.includes("console.error('Error fetching bookings"), 'Analytics logs bookings errors explicitly');
}

async function cleanup() {
  if (insertedIds.length > 0) {
    await supabase.from('bookings').delete().in('id', insertedIds);
    console.log(`\n🧹 Cleaned up ${insertedIds.length} test booking(s)`);
  }
}

async function runAll() {
  console.log('🧪 Running tests: fix-bookings-table-does-not-exist\n');
  console.log('='.repeat(60));

  try {
    await testBookingsTableExists();
    await testBookingsInsertFullPayload();
    await testRootHandlerColumnNames();
    await testAnalyticsConversionQuery();
    await testCancelledBookingUpdate();
    await testBookingsFileStructure();
  } finally {
    await cleanup();
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

runAll().catch(err => {
  console.error('\n💥 Test runner error:', err.message);
  process.exit(1);
});
