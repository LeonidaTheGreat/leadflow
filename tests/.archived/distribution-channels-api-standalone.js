#!/usr/bin/env node
/**
 * Standalone Test: Distribution Channels & Metrics API Accessibility
 * 
 * Issue: https://github.com/LeonidaTheGreat/leadflow/issues/09eb673c-a5c5-463d-b2ff-fef3f1601485
 * 
 * Problem:
 * - PostgREST query to http://localhost:8787/distribution_channels returned "Not found"
 * - Migration 006_distribution_metrics.sql had been run, but tables were not exposed via API
 * - This caused checkDistributionHealth() to fail, triggering PM heartbeat loop
 *
 * Solution:
 * - Added 'distribution_channels' and 'distribution_metrics' to ALLOWED_TABLES whitelist
 * - Tables now properly exposed via /rest/v1/ endpoints
 * - Heartbeat loop now resolved
 */

const http = require('http');
const assert = require('assert');

/**
 * Helper: Make HTTP request to PostgREST API
 */
function fetchAPI(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8787,
      path: path,
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, rawData: data });
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  let passed = 0;
  let failed = 0;
  const tests = [];
  
  // Test 1: distribution_channels endpoint accessible
  try {
    const result = await fetchAPI('/rest/v1/distribution_channels');
    if (result.status === 200 && Array.isArray(result.data)) {
      tests.push({ name: 'distribution_channels endpoint returns 200', passed: true });
      passed++;
    } else {
      tests.push({ 
        name: 'distribution_channels endpoint returns 200',
        passed: false,
        error: `Got status ${result.status}`
      });
      failed++;
    }
  } catch (e) {
    tests.push({ 
      name: 'distribution_channels endpoint returns 200',
      passed: false,
      error: e.message
    });
    failed++;
  }

  // Test 2: distribution_channels is valid JSON array
  try {
    const result = await fetchAPI('/rest/v1/distribution_channels');
    if (Array.isArray(result.data)) {
      tests.push({ name: 'distribution_channels returns JSON array', passed: true });
      passed++;
    } else {
      tests.push({ 
        name: 'distribution_channels returns JSON array',
        passed: false,
        error: `Got ${typeof result.data}`
      });
      failed++;
    }
  } catch (e) {
    tests.push({ 
      name: 'distribution_channels returns JSON array',
      passed: false,
      error: e.message
    });
    failed++;
  }

  // Test 3: distribution_channels has required columns
  try {
    const result = await fetchAPI('/rest/v1/distribution_channels');
    if (result.status === 200 && result.data.length > 0) {
      const record = result.data[0];
      const requiredCols = ['id', 'project_id', 'channel_type', 'name', 'status'];
      const hasCols = requiredCols.every(col => col in record);
      if (hasCols) {
        tests.push({ name: 'distribution_channels has all required columns', passed: true });
        passed++;
      } else {
        tests.push({ 
          name: 'distribution_channels has all required columns',
          passed: false,
          error: 'Missing columns'
        });
        failed++;
      }
    } else {
      tests.push({ 
        name: 'distribution_channels has all required columns',
        passed: false,
        error: 'No data returned'
      });
      failed++;
    }
  } catch (e) {
    tests.push({ 
      name: 'distribution_channels has all required columns',
      passed: false,
      error: e.message
    });
    failed++;
  }

  // Test 4: distribution_channels has landing page for leadflow
  try {
    const result = await fetchAPI('/rest/v1/distribution_channels?project_id=eq.leadflow&channel_type=eq.landing_page');
    if (result.status === 200 && Array.isArray(result.data)) {
      const activeLanding = result.data.filter(d => d.status === 'active');
      if (activeLanding.length > 0) {
        tests.push({ name: 'distribution_channels has active landing_page for leadflow', passed: true });
        passed++;
      } else {
        tests.push({ 
          name: 'distribution_channels has active landing_page for leadflow',
          passed: false,
          error: 'No active landing pages'
        });
        failed++;
      }
    }
  } catch (e) {
    tests.push({ 
      name: 'distribution_channels has active landing_page for leadflow',
      passed: false,
      error: e.message
    });
    failed++;
  }

  // Test 5: distribution_metrics endpoint accessible
  try {
    const result = await fetchAPI('/rest/v1/distribution_metrics');
    if (result.status === 200 && Array.isArray(result.data)) {
      tests.push({ name: 'distribution_metrics endpoint returns 200', passed: true });
      passed++;
    } else {
      tests.push({ 
        name: 'distribution_metrics endpoint returns 200',
        passed: false,
        error: `Got status ${result.status}`
      });
      failed++;
    }
  } catch (e) {
    tests.push({ 
      name: 'distribution_metrics endpoint returns 200',
      passed: false,
      error: e.message
    });
    failed++;
  }

  // Test 6: distribution_metrics is valid JSON array
  try {
    const result = await fetchAPI('/rest/v1/distribution_metrics');
    if (Array.isArray(result.data)) {
      tests.push({ name: 'distribution_metrics returns JSON array', passed: true });
      passed++;
    } else {
      tests.push({ 
        name: 'distribution_metrics returns JSON array',
        passed: false,
        error: `Got ${typeof result.data}`
      });
      failed++;
    }
  } catch (e) {
    tests.push({ 
      name: 'distribution_metrics returns JSON array',
      passed: false,
      error: e.message
    });
    failed++;
  }

  // Test 7: checkDistributionHealth integration
  try {
    const result = await fetchAPI('/rest/v1/distribution_channels?project_id=eq.leadflow');
    if (result.status === 200 && Array.isArray(result.data)) {
      const validStructure = result.data.every(d => 
        d.project_id === 'leadflow' && 
        d.channel_type && 
        d.status
      );
      if (validStructure) {
        tests.push({ name: 'checkDistributionHealth can query without errors', passed: true });
        passed++;
      } else {
        tests.push({ 
          name: 'checkDistributionHealth can query without errors',
          passed: false,
          error: 'Invalid structure'
        });
        failed++;
      }
    }
  } catch (e) {
    tests.push({ 
      name: 'checkDistributionHealth can query without errors',
      passed: false,
      error: e.message
    });
    failed++;
  }

  // Print results
  console.log('\n' + '='.repeat(60));
  console.log('Distribution Channels & Metrics API Test Results');
  console.log('='.repeat(60) + '\n');

  for (const test of tests) {
    const icon = test.passed ? '✓' : '✗';
    const status = test.passed ? 'PASS' : 'FAIL';
    console.log(`${icon} [${status}] ${test.name}`);
    if (!test.passed && test.error) {
      console.log(`       Error: ${test.error}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Total: ${passed} passed, ${failed} failed (${tests.length} total)`);
  console.log('='.repeat(60) + '\n');

  process.exit(failed === 0 ? 0 : 1);
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
