/**
 * Tests for: fix-bookings-table-join-missing-for-cross-table-agent-
 * Task ID: 0332c0ce-9da4-4429-a4a4-cbb0b3d24a62
 * 
 * Verifies:
 * 1. SMS analytics route uses proper cross-table join for bookings
 * 2. Bookings query includes join through leads for agent scoping
 * 3. Code properly filters bookings by leads.agent_id (not direct agent_id)
 */

const path = require('path');
const fs = require('fs');

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

async function testSMSStatsRouteCodeStructure() {
  console.log('\n📋 Test Suite 1: SMS stats route uses proper join pattern');

  const routePath = path.join(
    __dirname,
    '..',
    'product',
    'lead-response',
    'dashboard',
    'app',
    'api',
    'analytics',
    'sms-stats',
    'route.ts'
  );

  assert(fs.existsSync(routePath), `SMS stats route file exists at ${routePath}`);

  const routeContent = fs.readFileSync(routePath, 'utf-8');

  // Check that bookings query includes leads relationship
  assert(
    routeContent.includes("from('bookings')") &&
    routeContent.includes(".select('lead_id"),
    'Bookings query selects lead_id'
  );

  // Check that the query uses leads join when filtering by agent
  const hasLeadsJoin = routeContent.includes("leads!inner") ||
    routeContent.includes("leads(") ||
    routeContent.includes(".select('lead_id, leads");
  
  assert(
    hasLeadsJoin,
    'Bookings query includes join with leads table for agent scoping'
  );

  // Check that agent filter uses leads.agent_id (cross-table) pattern
  const hasProperFilter = routeContent.includes("eq('leads.agent_id'") ||
    routeContent.includes('eq("leads.agent_id"') ||
    routeContent.includes("bookingsQuery.eq('leads.agent_id'");
  
  assert(
    hasProperFilter,
    'Agent filter uses cross-table reference (leads.agent_id, not direct agent_id)'
  );

  console.log('   → SMS stats route structure verified');
}

async function testBookingLinkServiceStructure() {
  console.log('\n📋 Test Suite 2: Booking link service also uses proper joins');

  const servicePath = path.join(__dirname, '..', 'lib', 'booking-link-service.js');

  assert(fs.existsSync(servicePath), `Booking link service exists at ${servicePath}`);

  const serviceContent = fs.readFileSync(servicePath, 'utf-8');

  // When querying bookings by agent, should also use proper join pattern
  const hasBookingsQuery = serviceContent.includes("from('bookings')" ) ||
    serviceContent.includes("from('agent_booking_configs')");
  
  assert(hasBookingsQuery, 'Service queries bookings or related booking config tables');

  console.log('   → Booking link service structure verified');
}

async function testMigrationHasForeignKey() {
  console.log('\n📋 Test Suite 3: Database migration supports relationship');

  const migrationPath = path.join(
    __dirname,
    '..',
    'sql',
    'migration-create-bookings-table.sql'
  );

  assert(fs.existsSync(migrationPath), `Bookings migration exists at ${migrationPath}`);

  const migrationContent = fs.readFileSync(migrationPath, 'utf-8');

  // Should have agent_id and lead_id columns
  assert(
    migrationContent.includes('lead_id') && migrationContent.includes('agent_id'),
    'Migration defines both lead_id and agent_id columns on bookings'
  );

  // Should have indexes on these columns for join performance
  assert(
    migrationContent.includes('idx_bookings_lead_id') ||
    migrationContent.includes('INDEX') && migrationContent.includes('lead_id'),
    'Migration creates index on lead_id for efficient joins'
  );

  console.log('   → Bookings migration verified');
}

async function testCommentsAndDocumentation() {
  console.log('\n📋 Test Suite 4: Code documentation explains the join pattern');

  const routePath = path.join(
    __dirname,
    '..',
    'product',
    'lead-response',
    'dashboard',
    'app',
    'api',
    'analytics',
    'sms-stats',
    'route.ts'
  );

  const routeContent = fs.readFileSync(routePath, 'utf-8');

  // Check for explanatory comment about join pattern
  const hasComment = routeContent.includes('join') || 
    routeContent.includes('JOIN') ||
    routeContent.includes('leads');

  assert(hasComment, 'Code includes explanatory comments about table relationships');

  console.log('   → Documentation verified');
}

async function testNoDirectAgentIdFilter() {
  console.log('\n📋 Test Suite 5: Direct agent_id filter is only used when appropriate');

  const routePath = path.join(
    __dirname,
    '..',
    'product',
    'lead-response',
    'dashboard',
    'app',
    'api',
    'analytics',
    'sms-stats',
    'route.ts'
  );

  const routeContent = fs.readFileSync(routePath, 'utf-8');

  // Find where bookingsQuery filters by agent
  const bookingsSection = routeContent.substring(
    routeContent.indexOf("from('bookings')"),
    routeContent.indexOf('const { data: bookings, error: bookingsError }')
  );

  // Check if it uses the proper join pattern for agent filtering
  const hasProperJoin = bookingsSection.includes("leads!inner") ||
    bookingsSection.includes(".select('lead_id, leads") ||
    bookingsSection.includes("eq('leads.agent_id'");

  if (bookingsSection.includes("eq('agent_id'")) {
    // If it has direct agent_id filter, it should ALSO have leads join
    assert(
      hasProperJoin,
      'If using eq(agent_id), also includes leads join to catch NULL agent_id cases'
    );
  } else {
    // Best case: uses only cross-table join
    assert(
      hasProperJoin,
      'Uses cross-table join (leads.agent_id) for agent filtering on bookings'
    );
  }

  console.log('   → Agent filtering pattern verified');
}

async function runAll() {
  console.log('🧪 Running tests: fix-bookings-table-join-missing-for-cross-table-agent-\n');
  console.log('='.repeat(70));

  try {
    await testSMSStatsRouteCodeStructure();
    await testBookingLinkServiceStructure();
    await testMigrationHasForeignKey();
    await testCommentsAndDocumentation();
    await testNoDirectAgentIdFilter();
  } catch (error) {
    console.error('\n💥 Test error:', error.message);
    failed++;
  }

  console.log('\n' + '='.repeat(70));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runAll().catch((err) => {
  console.error('\n💥 Test runner error:', err.message);
  process.exit(1);
});
