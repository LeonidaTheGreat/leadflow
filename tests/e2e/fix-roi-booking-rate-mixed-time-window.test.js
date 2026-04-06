/**
 * Tests for: fix-roi-booking-rate-mixed-time-window
 * Task ID: bcd366d5-861f-4933-9115-f5c936dee333
 *
 * Verifies:
 * 1. ROI route uses all-time bookings (not monthly) for bookingRate calculation
 * 2. Route queries bookings table (not calcom_bookings)
 * 3. Route includes two booking queries: one scoped to month, one all-time
 * 4. appointmentsBookedThisMonth is still returned for the display card
 * 5. bookingRate = allTimeBookings / leadsResponded (not monthly bookings)
 */

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

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

const ROUTE_PATH = path.join(
  __dirname,
  '../../product/lead-response/dashboard/app/api/metrics/roi/route.ts'
);

function testRouteFileExists() {
  console.log('\n📋 Test Suite 1: Route file structure');
  assert(fs.existsSync(ROUTE_PATH), 'ROI route file exists at expected path');
}

function testNoCalcomBookingsTable() {
  console.log('\n📋 Test Suite 2: Correct table name (not calcom_bookings)');
  const content = fs.readFileSync(ROUTE_PATH, 'utf-8');
  assert(
    !content.includes("from('calcom_bookings')"),
    "Route does NOT query calcom_bookings (old table name)"
  );
  assert(
    content.includes("from('bookings')"),
    "Route queries the bookings table"
  );
}

function testTwoBookingQueries() {
  console.log('\n📋 Test Suite 3: Two booking queries (monthly + all-time)');
  const content = fs.readFileSync(ROUTE_PATH, 'utf-8');

  // Count occurrences of .from('bookings')
  const matches = content.match(/\.from\('bookings'\)/g) || [];
  assert(
    matches.length >= 2,
    `Route contains at least 2 bookings queries (found ${matches.length}) — one monthly, one all-time`
  );

  // Monthly query has date filter
  assert(
    content.includes('monthStart') && content.includes('monthEnd'),
    'Route has date-bounded monthly booking query (monthStart/monthEnd)'
  );

  // All-time query exists (no date filter path)
  assert(
    content.includes('appointmentsBookedAllTime') || content.includes('allTimeBookings'),
    'Route has all-time booking count variable'
  );
}

function testBookingRateUsesAllTime() {
  console.log('\n📋 Test Suite 4: bookingRate uses all-time count, not monthly');
  const content = fs.readFileSync(ROUTE_PATH, 'utf-8');

  // Should NOT use monthly bookings for booking rate
  assert(
    !content.match(/bookingRate\s*=\s*appointmentsBookedThisMonth\s*\/\s*leadsResponded/),
    'bookingRate does NOT use appointmentsBookedThisMonth / leadsResponded (was the bug)'
  );

  // Should use all-time bookings
  assert(
    content.match(/bookingRate\s*=\s*(appointmentsBookedAllTime|allTimeBookings)\s*\/\s*leadsResponded/),
    'bookingRate = allTimeBookings / leadsResponded (fix confirmed)'
  );
}

function testMonthlyBookingsStillReturned() {
  console.log('\n📋 Test Suite 5: appointmentsBookedThisMonth still in return value');
  const content = fs.readFileSync(ROUTE_PATH, 'utf-8');

  assert(
    content.includes('appointmentsBookedThisMonth'),
    'appointmentsBookedThisMonth variable exists (display card)'
  );

  // The success return block includes appointmentsBookedThisMonth in the JSON payload
  // Find the return that includes leadsResponded (the success response)
  const successReturnIdx = content.indexOf('leadsResponded,');
  assert(
    successReturnIdx >= 0 && content.slice(Math.max(0, successReturnIdx - 200), successReturnIdx + 500).includes('appointmentsBookedThisMonth'),
    'appointmentsBookedThisMonth is included in the API response (display card preserved)'
  );
}

function testAllTimeBookingsErrorHandled() {
  console.log('\n📋 Test Suite 6: All-time bookings query has error handling');
  const content = fs.readFileSync(ROUTE_PATH, 'utf-8');

  assert(
    content.includes('allTimeBookingsError') || content.includes('allTimeError'),
    'All-time bookings query has a dedicated error variable'
  );

  assert(
    content.includes("Failed to fetch bookings"),
    'Error response includes descriptive message for bookings failure'
  );
}

function runAll() {
  console.log('🧪 Running tests: fix-roi-booking-rate-mixed-time-window\n');
  console.log('='.repeat(60));

  testRouteFileExists();
  testNoCalcomBookingsTable();
  testTwoBookingQueries();
  testBookingRateUsesAllTime();
  testMonthlyBookingsStillReturned();
  testAllTimeBookingsErrorHandled();

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

runAll();
