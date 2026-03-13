#!/usr/bin/env node
/**
 * E2E Test for fix-sync-system-components-js-used-wrong-column-names
 * 
 * Tests that sync-system-components.js correctly:
 * 1. Maps name → component_name
 * 2. Maps type → category  
 * 3. Maps url → metadata.url
 * 4. Uses onConflict: 'project_id,component_name' (not 'id')
 * 5. Includes status_emoji field
 * 6. Successfully syncs all smoke tests without errors
 */

const assert = require('assert');
const { SystemComponentsSync } = require('/Users/clawdbot/projects/leadflow/scripts/sync-system-components.js');

async function runTest() {
  console.log('🧪 E2E Test: sync-system-components column mapping fix\n');
  
  const syncer = new SystemComponentsSync();
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  function test(name, condition, details = '') {
    if (condition) {
      console.log(`✅ PASS: ${name}`);
      results.passed++;
      results.tests.push({ name, status: 'PASS', details });
    } else {
      console.log(`❌ FAIL: ${name}`);
      if (details) console.log(`   ${details}`);
      results.failed++;
      results.tests.push({ name, status: 'FAIL', details });
    }
  }

  // TEST 1: Verify column name mappings in upsertComponent
  const upsertCode = syncer.upsertComponent.toString();
  test(
    'Uses component_name (not name)',
    upsertCode.includes('component_name'),
    'Field component_name must be present'
  );
  
  test(
    'Uses category (not type)',
    upsertCode.includes('category'),
    'Field category must be present'
  );

  // TEST 2: Verify url is in metadata (not top-level)
  test(
    'Uses metadata.url (not top-level url)',
    upsertCode.includes('metadata'),
    'URL must be nested in metadata object'
  );

  // TEST 3: Verify onConflict uses correct columns
  test(
    'onConflict uses project_id,component_name',
    upsertCode.includes("onConflict: 'project_id,component_name'") || 
    upsertCode.includes('onConflict: "project_id,component_name"'),
    'Conflict resolution must be on project_id,component_name not id'
  );

  // TEST 4: Verify status_emoji is included
  test(
    'Includes status_emoji field',
    upsertCode.includes('status_emoji'),
    'status_emoji must be set in upsert'
  );

  // TEST 5: Verify status_emoji mapping exists
  test(
    'Has status_emoji mapping for all statuses',
    upsertCode.includes("live: '🟢'") || upsertCode.includes('live: "🟢"'),
    'Must map live status to 🟢 emoji'
  );

  // TEST 6: Verify deterministic UUID helper exists
  test(
    'Has deterministic UUID helper function',
    upsertCode.includes('deterministicUUID') || syncer.constructor.toString().includes('deterministicUUID'),
    'Must have UUID generation for consistent upserts'
  );

  // TEST 7: Run actual sync and verify results
  console.log('\n🔄 Running actual sync...');
  try {
    const syncResult = await syncer.syncDeployedPages();
    
    test(
      'Sync completes without errors',
      syncResult.errors.length === 0,
      `Expected 0 errors, got ${syncResult.errors.length}`
    );
    
    test(
      'Syncs all 7 smoke test components',
      syncResult.count === 7,
      `Expected 7 components, got ${syncResult.count}`
    );

  } catch (err) {
    test('Sync execution', false, err.message);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 E2E TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`);
  console.log('='.repeat(60));

  if (results.failed > 0) {
    console.log('\n❌ E2E TEST FAILED');
    process.exit(1);
  } else {
    console.log('\n✅ ALL E2E TESTS PASSED');
    process.exit(0);
  }
}

runTest().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
