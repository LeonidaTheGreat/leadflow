/**
 * Test: Distribution Channels & Metrics API Accessibility
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
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

describe('Distribution Channels API', () => {
  
  test('distribution_channels endpoint is accessible (HTTP 200)', async () => {
    const result = await fetchAPI('/rest/v1/distribution_channels');
    assert.strictEqual(result.status, 200, 'Expected HTTP 200');
    assert(Array.isArray(result.data), 'Expected array response');
  });

  test('distribution_channels returns JSON array', async () => {
    const result = await fetchAPI('/rest/v1/distribution_channels');
    assert.strictEqual(result.status, 200);
    assert(Array.isArray(result.data), 'Response should be an array');
  });

  test('distribution_channels includes expected columns', async () => {
    const result = await fetchAPI('/rest/v1/distribution_channels');
    assert.strictEqual(result.status, 200);
    
    if (result.data.length > 0) {
      const record = result.data[0];
      const requiredCols = ['id', 'project_id', 'channel_type', 'name', 'status'];
      for (const col of requiredCols) {
        assert(col in record, `Missing required column: ${col}`);
      }
    }
  });

  test('distribution_channels has landing_page channel for leadflow project', async () => {
    const result = await fetchAPI('/rest/v1/distribution_channels?project_id=eq.leadflow&channel_type=eq.landing_page');
    assert.strictEqual(result.status, 200);
    assert(Array.isArray(result.data), 'Expected array response');
    
    // Should have at least one active landing page
    const activeLanding = result.data.filter(d => d.status === 'active');
    assert(activeLanding.length > 0, 'Expected at least one active landing_page channel');
  });

});

describe('Distribution Metrics API', () => {
  
  test('distribution_metrics endpoint is accessible (HTTP 200)', async () => {
    const result = await fetchAPI('/rest/v1/distribution_metrics');
    assert.strictEqual(result.status, 200, 'Expected HTTP 200');
    assert(Array.isArray(result.data), 'Expected array response');
  });

  test('distribution_metrics returns JSON array', async () => {
    const result = await fetchAPI('/rest/v1/distribution_metrics');
    assert.strictEqual(result.status, 200);
    assert(Array.isArray(result.data), 'Response should be an array');
  });

  test('distribution_metrics includes expected columns', async () => {
    const result = await fetchAPI('/rest/v1/distribution_metrics');
    
    // Can be empty initially, but structure should be correct if any rows exist
    if (result.data.length > 0) {
      const record = result.data[0];
      const requiredCols = ['id', 'project_id', 'date', 'visitors', 'conversions'];
      for (const col of requiredCols) {
        assert(col in record, `Missing required column: ${col}`);
      }
    }
  });

});

describe('Distribution Health Check Integration', () => {
  
  test('checkDistributionHealth can query distribution_channels without errors', async () => {
    // This simulates what the heartbeat executor does
    const result = await fetchAPI('/rest/v1/distribution_channels?project_id=eq.leadflow');
    
    assert.strictEqual(result.status, 200, 'API should return 200 for valid query');
    assert(Array.isArray(result.data), 'Should return array of channels');
    
    // Verify structure that checkDistributionHealth expects
    for (const channel of result.data) {
      assert(channel.project_id === 'leadflow', 'Should filter by project_id');
      assert(channel.channel_type, 'Should have channel_type');
      assert(channel.status, 'Should have status');
    }
  });

});
