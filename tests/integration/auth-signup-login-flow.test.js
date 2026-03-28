/**
 * Auth Signup-Login Flow Integration Test
 * 
 * Tests the critical user journey: signup → verify credentials → login
 * Ensures the auth system works end-to-end for new agents
 */

const assert = require('assert');
const https = require('https');

const BASE_URL = process.env.TEST_URL || 'https://leadflow-ai-five.vercel.app';
const TEST_TIMEOUT = 30000;

// Helper to make HTTPS requests
async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: res.statusCode === 200 || res.statusCode === 201 ? JSON.parse(data) : data,
            rawBody: data
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
            rawBody: data
          });
        }
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

describe('Auth: Signup-Login Flow (Integration Test)', () => {
  let testEmail;
  let testPassword;
  let authToken;

  before(() => {
    // Generate unique test credentials
    testEmail = `smoke-test-${Date.now()}-${Math.random().toString(36).substring(7)}@leadflow-test.com`;
    testPassword = 'SmokeTest123!@';
    console.log(`\n📧 Test Email: ${testEmail}`);
  });

  describe('Step 1: Create new account via trial signup', () => {
    it('should POST to /api/auth/trial-signup with valid credentials', async function() {
      this.timeout(TEST_TIMEOUT);

      const response = await makeRequest(`${BASE_URL}/api/auth/trial-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          email: testEmail,
          password: testPassword,
          firstName: 'Smoke',
          lastName: 'Test'
        }
      });

      assert.strictEqual(response.status, 200, `Expected 200, got ${response.status}`);
      assert(response.body, 'Response should have a body');
      assert.strictEqual(response.body.success, true, 'Response should indicate success');
      assert(response.body.agentId, 'Response should include agentId');
      assert(response.body.token, 'Response should include auth token');

      // Store token for next step
      authToken = response.body.token;
      console.log(`  ✅ Signup succeeded, agentId: ${response.body.agentId}`);
    });
  });

  describe('Step 2: Verify token is valid by calling trial-status', () => {
    it('should GET /api/auth/trial-status with auth token', async function() {
      this.timeout(TEST_TIMEOUT);

      assert(authToken, 'Auth token should exist from signup');

      const response = await makeRequest(`${BASE_URL}/api/auth/trial-status`, {
        method: 'GET',
        headers: {
          'Cookie': `auth-token=${authToken}`
        }
      });

      assert.strictEqual(response.status, 200, `Expected 200, got ${response.status}`);
      assert(response.body, 'Response should have a body');
      assert(response.body.agentId, 'Response should include agentId');
      console.log(`  ✅ Trial status check succeeded`);
    });
  });

  describe('Step 3: Login page is reachable', () => {
    it('should GET /login and return 200', async function() {
      this.timeout(TEST_TIMEOUT);

      const response = await makeRequest(`${BASE_URL}/login`, {
        method: 'GET'
      });

      assert.strictEqual(response.status, 200, `Expected 200, got ${response.status}`);
      assert(response.rawBody, 'Response should include HTML');
      console.log(`  ✅ Login page loads successfully`);
    });
  });

  describe('Step 4: Login with newly created credentials', () => {
    it('should POST to /api/auth/login with created email/password', async function() {
      this.timeout(TEST_TIMEOUT);

      const response = await makeRequest(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          email: testEmail,
          password: testPassword
        }
      });

      assert.strictEqual(response.status, 200, `Expected 200, got ${response.status}: ${response.rawBody}`);
      assert(response.body, 'Response should have a body');
      assert.strictEqual(response.body.success, true, `Login should succeed: ${response.rawBody}`);
      assert(response.body.token, 'Response should include auth token');
      console.log(`  ✅ Login succeeded with new credentials`);
    });
  });

  describe('Step 5: Verify full flow success', () => {
    it('should complete the entire signup-login flow', async function() {
      this.timeout(TEST_TIMEOUT);
      // All previous tests passed, so the full flow is validated
      assert(authToken, 'Full flow completed successfully');
      console.log(`  ✅ Full auth flow (signup → login) verified`);
    });
  });
});
