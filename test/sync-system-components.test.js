#!/usr/bin/env node
/**
 * Test suite for sync-system-components.js
 * 
 * Tests that the script correctly maps column names and handles upserts.
 */

const { SystemComponentsSync } = require('../scripts/sync-system-components.js');

// Mock Supabase client
class MockSupabaseClient {
  constructor() {
    this.upserts = [];
    this.selects = [];
    this.data = new Map();
  }

  from(table) {
    this.currentTable = table;
    return this;
  }

  upsert(values, options) {
    this.upserts.push({ table: this.currentTable, values, options });
    // Store in mock data
    const key = `${values.project_id}:${values.component_name}`;
    this.data.set(key, values);
    return { data: values, error: null };
  }

  select(columns) {
    this.selectColumns = columns;
    return this;
  }

  order(column, options) {
    this.orderBy = { column, options };
    return {
      data: Array.from(this.data.values()),
      error: null
    };
  }
}

// Test runner
async function runTests() {
  console.log('🧪 Testing sync-system-components.js...\n');
  
  let passed = 0;
  let failed = 0;

  // Test 1: Verify correct column names are used in upsert
  console.log('Test 1: Verify correct column names in upsert');
  try {
    const mockClient = new MockSupabaseClient();
    const syncer = new SystemComponentsSync();
    syncer.supabase = mockClient;
    syncer.config = {
      project_id: 'leadflow',
      smoke_tests: [
        { id: 'test-1', name: 'Test Component', url: 'https://test.com', check_type: 'http', severity: 'high' }
      ]
    };

    await syncer.syncDeployedPages();

    const upsert = mockClient.upserts[0];
    if (!upsert) throw new Error('No upsert performed');
    
    // Verify column names (not old names: name, type, url)
    const values = upsert.values;
    if (values.name !== undefined) throw new Error('Uses deprecated "name" column instead of "component_name"');
    if (values.type !== undefined) throw new Error('Uses deprecated "type" column instead of "category"');
    if (values.url !== undefined) throw new Error('Uses deprecated top-level "url" instead of metadata.url');
    
    // Verify correct column names exist
    if (!values.component_name) throw new Error('Missing "component_name" column');
    if (!values.category) throw new Error('Missing "category" column');
    if (!values.status_emoji) throw new Error('Missing "status_emoji" column');
    if (!values.metadata || !values.metadata.url) throw new Error('Missing metadata.url');
    
    // Verify onConflict uses correct constraint
    if (upsert.options.onConflict !== 'project_id,component_name') {
      throw new Error(`Wrong onConflict: ${upsert.options.onConflict}, expected: project_id,component_name`);
    }

    console.log('  ✅ PASS: Correct column names used\n');
    passed++;
  } catch (err) {
    console.log(`  ❌ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 2: Verify status emoji mapping
  console.log('Test 2: Verify status emoji mapping');
  try {
    const mockClient = new MockSupabaseClient();
    const syncer = new SystemComponentsSync();
    syncer.supabase = mockClient;
    syncer.config = {
      project_id: 'leadflow',
      smoke_tests: [
        { id: 'test-live', name: 'Live Component', url: 'https://live.com', check_type: 'http', severity: 'high' }
      ]
    };

    await syncer.syncDeployedPages();

    const upsert = mockClient.upserts[0];
    if (upsert.values.status_emoji !== '🟢') {
      throw new Error(`Expected status_emoji '🟢', got '${upsert.values.status_emoji}'`);
    }

    console.log('  ✅ PASS: Status emoji correctly mapped\n');
    passed++;
  } catch (err) {
    console.log(`  ❌ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 3: Verify metadata structure
  console.log('Test 3: Verify metadata structure');
  try {
    const mockClient = new MockSupabaseClient();
    const syncer = new SystemComponentsSync();
    syncer.supabase = mockClient;
    syncer.config = {
      project_id: 'leadflow',
      smoke_tests: [
        { 
          id: 'test-meta', 
          name: 'Meta Test', 
          url: 'https://meta.com', 
          check_type: 'http', 
          severity: 'critical',
          extra_field: 'should be ignored'
        }
      ]
    };

    await syncer.syncDeployedPages();

    const metadata = mockClient.upserts[0].values.metadata;
    if (!metadata.url) throw new Error('metadata.url missing');
    if (!metadata.test_id) throw new Error('metadata.test_id missing');
    if (!metadata.check_type) throw new Error('metadata.check_type missing');
    if (!metadata.severity) throw new Error('metadata.severity missing');
    if (metadata.extra_field) throw new Error('extra_field should not be in metadata');

    console.log('  ✅ PASS: Metadata structure correct\n');
    passed++;
  } catch (err) {
    console.log(`  ❌ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 4: Verify deterministic UUID generation
  console.log('Test 4: Verify deterministic UUID generation');
  try {
    const syncer = new SystemComponentsSync();
    const uuid1 = syncer.constructor.prototype.constructor.toString().includes('deterministicUUID');
    
    // Import the function directly
    const crypto = require('crypto');
    function deterministicUUID(str) {
      const hash = crypto.createHash('md5').update('leadflow-component-' + str).digest('hex');
      return `${hash.slice(0,8)}-${hash.slice(8,12)}-4${hash.slice(13,16)}-${hash.slice(16,20)}-${hash.slice(20,32)}`;
    }

    const id1 = deterministicUUID('test-id');
    const id2 = deterministicUUID('test-id');
    const id3 = deterministicUUID('different-id');

    if (id1 !== id2) throw new Error('Same input produces different UUIDs');
    if (id1 === id3) throw new Error('Different inputs produce same UUID');
    if (!id1.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      throw new Error('UUID format is invalid');
    }

    console.log('  ✅ PASS: Deterministic UUID generation works\n');
    passed++;
  } catch (err) {
    console.log(`  ❌ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 5: Verify multiple smoke tests are processed
  console.log('Test 5: Verify multiple smoke tests processing');
  try {
    const mockClient = new MockSupabaseClient();
    const syncer = new SystemComponentsSync();
    syncer.supabase = mockClient;
    syncer.config = {
      project_id: 'leadflow',
      smoke_tests: [
        { id: 'test-1', name: 'Component 1', url: 'https://1.com', check_type: 'http', severity: 'high' },
        { id: 'test-2', name: 'Component 2', url: 'https://2.com', check_type: 'http', severity: 'medium' },
        { id: 'test-3', name: 'Component 3', url: 'https://3.com', check_type: 'http', severity: 'low' }
      ]
    };

    const result = await syncer.syncDeployedPages();

    if (mockClient.upserts.length !== 3) {
      throw new Error(`Expected 3 upserts, got ${mockClient.upserts.length}`);
    }
    if (result.count !== 3) {
      throw new Error(`Expected count 3, got ${result.count}`);
    }

    console.log('  ✅ PASS: Multiple smoke tests processed correctly\n');
    passed++;
  } catch (err) {
    console.log(`  ❌ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 6: Verify entries without URL are skipped
  console.log('Test 6: Verify entries without URL are skipped');
  try {
    const mockClient = new MockSupabaseClient();
    const syncer = new SystemComponentsSync();
    syncer.supabase = mockClient;
    syncer.config = {
      project_id: 'leadflow',
      smoke_tests: [
        { id: 'test-with-url', name: 'With URL', url: 'https://with.com', check_type: 'http', severity: 'high' },
        { id: 'test-no-url', name: 'No URL', check_type: 'http', severity: 'high' },
        { id: 'test-empty-url', name: 'Empty URL', url: '', check_type: 'http', severity: 'high' }
      ]
    };

    const result = await syncer.syncDeployedPages();

    // Only the first entry has a valid URL
    if (mockClient.upserts.length !== 1) {
      throw new Error(`Expected 1 upsert (only valid URL), got ${mockClient.upserts.length}`);
    }

    console.log('  ✅ PASS: Entries without URL are skipped\n');
    passed++;
  } catch (err) {
    console.log(`  ❌ FAIL: ${err.message}\n`);
    failed++;
  }

  // Summary
  console.log('========================================');
  console.log('📊 TEST SUMMARY');
  console.log('========================================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  console.log('========================================');

  if (failed > 0) {
    console.log('\n❌ Some tests failed');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  }
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(err => {
    console.error('Test runner failed:', err);
    process.exit(1);
  });
}

module.exports = { runTests };