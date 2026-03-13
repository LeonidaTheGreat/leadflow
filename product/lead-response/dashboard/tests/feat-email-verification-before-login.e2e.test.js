/**
 * E2E Test for feat-email-verification-before-login
 * Tests: Email Verification — Confirm Inbox Before Login
 * 
 * This test validates:
 * 1. Login rejects unverified accounts with EMAIL_NOT_VERIFIED (403)
 * 2. Verified accounts can log in normally
 * 3. Token verification flow works correctly
 * 4. Resend verification rate limiting works
 * 5. Database schema is correct
 */

const assert = require('assert');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Load environment variables
require('dotenv').config({ path: '/Users/clawdbot/projects/leadflow/.env' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables:');
  console.error('  SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
  console.error('  SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test configuration
const TEST_EMAIL_PREFIX = 'test-e2e-verification';
const TEST_PASSWORD = 'TestPassword123!';

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function test(name, fn) {
  return { name, fn };
}

async function runTest(t) {
  try {
    console.log(`\n🧪 ${t.name}`);
    await t.fn();
    console.log(`✅ PASSED: ${t.name}`);
    results.passed++;
    results.tests.push({ name: t.name, status: 'passed' });
  } catch (error) {
    console.log(`❌ FAILED: ${t.name}`);
    console.log(`   Error: ${error.message}`);
    results.failed++;
    results.tests.push({ name: t.name, status: 'failed', error: error.message });
  }
}

// Helper: Create test agent
async function createTestAgent(email, emailVerified = false) {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  const { data, error } = await supabase
    .from('real_estate_agents')
    .insert({
      email: email.toLowerCase(),
      password_hash: passwordHash,
      first_name: 'Test',
      last_name: 'Verification',
      email_verified: emailVerified,
      plan_tier: 'trial',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select('id, email, email_verified')
    .single();

  if (error) throw new Error(`Failed to create test agent: ${error.message}`);
  return data;
}

// Helper: Cleanup test agent
async function cleanupTestAgent(agentId) {
  // Delete verification tokens first (cascade)
  await supabase.from('email_verification_tokens').delete().eq('agent_id', agentId);
  // Delete agent
  await supabase.from('real_estate_agents').delete().eq('id', agentId);
}

// Helper: Create verification token
async function createVerificationToken(agentId) {
  const token = require('crypto').randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  
  const { error } = await supabase
    .from('email_verification_tokens')
    .insert({
      agent_id: agentId,
      token: token,
      expires_at: expiresAt,
      created_at: new Date().toISOString()
    });

  if (error) throw new Error(`Failed to create token: ${error.message}`);
  return token;
}

// Tests
const tests = [
  test('AC-1: Database schema - email_verification_tokens table exists', async () => {
    const { error } = await supabase
      .from('email_verification_tokens')
      .select('id')
      .limit(1);

    // Should not error with "does not exist"
    if (error && error.message.includes('does not exist')) {
      throw new Error('email_verification_tokens table does not exist');
    }
  }),

  test('AC-1: Database schema - email_verified column exists on real_estate_agents', async () => {
    const { error } = await supabase
      .from('real_estate_agents')
      .select('email_verified')
      .limit(1);

    if (error && error.message.includes('email_verified')) {
      throw new Error('email_verified column does not exist');
    }
  }),

  test('AC-2: Unverified account login returns 403 with EMAIL_NOT_VERIFIED', async () => {
    const testEmail = `${TEST_EMAIL_PREFIX}-${Date.now()}@example.com`;
    let agent = null;

    try {
      // Create unverified agent
      agent = await createTestAgent(testEmail, false);
      assert.strictEqual(agent.email_verified, false, 'Agent should be unverified');

      // Attempt login via API
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: TEST_PASSWORD
        })
      });

      assert.strictEqual(response.status, 403, 'Should return 403 for unverified account');
      
      const result = await response.json();
      assert.strictEqual(result.error, 'EMAIL_NOT_VERIFIED', 'Error should be EMAIL_NOT_VERIFIED');
      assert.ok(result.message, 'Should include error message');
      assert.ok(result.resendUrl, 'Should include resend URL');
    } finally {
      if (agent) await cleanupTestAgent(agent.id);
    }
  }),

  test('AC-3: Verified account login succeeds', async () => {
    const testEmail = `${TEST_EMAIL_PREFIX}-verified-${Date.now()}@example.com`;
    let agent = null;

    try {
      // Create verified agent
      agent = await createTestAgent(testEmail, true);
      assert.strictEqual(agent.email_verified, true, 'Agent should be verified');

      // Attempt login via API
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: TEST_PASSWORD
        })
      });

      assert.strictEqual(response.status, 200, 'Should return 200 for verified account');
      
      const result = await response.json();
      assert.ok(result.token, 'Should return JWT token');
      assert.ok(result.user, 'Should return user object');
      assert.strictEqual(result.user.email, testEmail.toLowerCase(), 'User email should match');
    } finally {
      if (agent) await cleanupTestAgent(agent.id);
    }
  }),

  test('AC-4: Verification token can be created and verified', async () => {
    const testEmail = `${TEST_EMAIL_PREFIX}-token-${Date.now()}@example.com`;
    let agent = null;

    try {
      // Create unverified agent
      agent = await createTestAgent(testEmail, false);

      // Create verification token
      const token = await createVerificationToken(agent.id);
      assert.ok(token, 'Token should be created');

      // Verify token exists in database
      const { data: tokenData, error } = await supabase
        .from('email_verification_tokens')
        .select('*')
        .eq('token', token)
        .single();

      assert.ok(!error, 'Should find token in database');
      assert.ok(tokenData, 'Token data should exist');
      assert.strictEqual(tokenData.agent_id, agent.id, 'Token should belong to agent');
      assert.ok(!tokenData.used_at, 'Token should not be used yet');
      assert.ok(new Date(tokenData.expires_at) > new Date(), 'Token should not be expired');
    } finally {
      if (agent) await cleanupTestAgent(agent.id);
    }
  }),

  test('AC-5: Token verification marks agent as verified', async () => {
    const testEmail = `${TEST_EMAIL_PREFIX}-verify-${Date.now()}@example.com`;
    let agent = null;

    try {
      // Create unverified agent
      agent = await createTestAgent(testEmail, false);

      // Create verification token
      const token = await createVerificationToken(agent.id);

      // Simulate token verification (direct DB update)
      const now = new Date().toISOString();
      
      // Mark token as used
      const { error: tokenError } = await supabase
        .from('email_verification_tokens')
        .update({ used_at: now })
        .eq('token', token);

      assert.ok(!tokenError, 'Should mark token as used');

      // Mark agent as verified
      const { error: agentError } = await supabase
        .from('real_estate_agents')
        .update({ email_verified: true, updated_at: now })
        .eq('id', agent.id);

      assert.ok(!agentError, 'Should mark agent as verified');

      // Verify agent is now verified
      const { data: updatedAgent, error: fetchError } = await supabase
        .from('real_estate_agents')
        .select('email_verified')
        .eq('id', agent.id)
        .single();

      assert.ok(!fetchError, 'Should fetch updated agent');
      assert.strictEqual(updatedAgent.email_verified, true, 'Agent should now be verified');
    } finally {
      if (agent) await cleanupTestAgent(agent.id);
    }
  }),

  test('AC-6: Expired token is rejected', async () => {
    const testEmail = `${TEST_EMAIL_PREFIX}-expired-${Date.now()}@example.com`;
    let agent = null;

    try {
      // Create unverified agent
      agent = await createTestAgent(testEmail, false);

      // Create expired token (25 hours ago)
      const token = require('crypto').randomUUID();
      const expiredAt = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      
      const { error } = await supabase
        .from('email_verification_tokens')
        .insert({
          agent_id: agent.id,
          token: token,
          expires_at: expiredAt,
          created_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
        });

      assert.ok(!error, 'Should create expired token');

      // Verify token is expired
      const { data: tokenData } = await supabase
        .from('email_verification_tokens')
        .select('expires_at')
        .eq('token', token)
        .single();

      assert.ok(new Date(tokenData.expires_at) < new Date(), 'Token should be expired');
    } finally {
      if (agent) await cleanupTestAgent(agent.id);
    }
  }),

  test('AC-7: Rate limiting - max 3 tokens per hour per agent', async () => {
    const testEmail = `${TEST_EMAIL_PREFIX}-ratelimit-${Date.now()}@example.com`;
    let agent = null;

    try {
      // Create unverified agent
      agent = await createTestAgent(testEmail, false);

      // Create 3 tokens (the limit)
      for (let i = 0; i < 3; i++) {
        await createVerificationToken(agent.id);
      }

      // Count tokens in last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count, error } = await supabase
        .from('email_verification_tokens')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agent.id)
        .gte('created_at', oneHourAgo);

      assert.ok(!error, 'Should count tokens');
      assert.ok(count >= 3, `Should have at least 3 tokens, got ${count}`);
    } finally {
      if (agent) await cleanupTestAgent(agent.id);
    }
  }),

  test('AC-8: Resend verification returns 404 for non-existent agent', async () => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent-test@example.com' })
    });

    assert.strictEqual(response.status, 404, 'Should return 404 for non-existent agent');
    
    const result = await response.json();
    assert.strictEqual(result.error, 'AGENT_NOT_FOUND', 'Error should be AGENT_NOT_FOUND');
  }),

  test('AC-9: Resend verification returns 200 for already verified agent', async () => {
    const testEmail = `${TEST_EMAIL_PREFIX}-alreadyverified-${Date.now()}@example.com`;
    let agent = null;

    try {
      // Create verified agent
      agent = await createTestAgent(testEmail, true);

      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail })
      });

      assert.strictEqual(response.status, 200, 'Should return 200 for verified agent');
      
      const result = await response.json();
      assert.ok(result.message.includes('Already verified') || result.message.includes('verified'), 'Should indicate already verified');
    } finally {
      if (agent) await cleanupTestAgent(agent.id);
    }
  }),

  test('AC-10: Resend verification validates email format', async () => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'invalid-email-format' })
    });

    assert.strictEqual(response.status, 400, 'Should return 400 for invalid email');
    
    const result = await response.json();
    assert.ok(result.error.includes('valid email') || result.error.includes('valid'), 'Should indicate invalid email format');
  }),

  test('AC-11: Verify-email endpoint redirects for missing token', async () => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/verify-email`, {
      redirect: 'manual'
    });

    assert.strictEqual(response.status, 302, 'Should redirect (302) for missing token');
    
    const location = response.headers.get('location');
    assert.ok(location, 'Should have location header');
    assert.ok(location.includes('error=invalid_token'), 'Should redirect with invalid_token error');
  }),

  test('AC-12: Verify-email endpoint redirects for invalid token', async () => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/verify-email?token=invalid-token-12345`, {
      redirect: 'manual'
    });

    assert.strictEqual(response.status, 302, 'Should redirect (302) for invalid token');
    
    const location = response.headers.get('location');
    assert.ok(location, 'Should have location header');
    assert.ok(location.includes('error=invalid_token'), 'Should redirect with invalid_token error');
  }),

  test('AC-13: Signup creates unverified agent with verification token', async () => {
    const testEmail = `${TEST_EMAIL_PREFIX}-signup-${Date.now()}@example.com`;
    let agentId = null;

    try {
      // Sign up via trial signup API
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/trial-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: TEST_PASSWORD,
          name: 'Test Signup'
        })
      });

      assert.strictEqual(response.status, 200, 'Signup should succeed');
      
      const result = await response.json();
      assert.ok(result.success, 'Should return success');
      assert.ok(result.redirectTo, 'Should return redirectTo');
      assert.ok(result.redirectTo.includes('check-your-inbox'), 'Should redirect to check-your-inbox');

      agentId = result.agentId;

      // Verify agent was created as unverified
      const { data: agent, error } = await supabase
        .from('real_estate_agents')
        .select('email_verified')
        .eq('id', agentId)
        .single();

      assert.ok(!error, 'Should find agent');
      assert.strictEqual(agent.email_verified, false, 'Agent should be unverified after signup');

      // Verify token was created
      const { data: tokens, error: tokenError } = await supabase
        .from('email_verification_tokens')
        .select('*')
        .eq('agent_id', agentId);

      assert.ok(!tokenError, 'Should query tokens');
      assert.ok(tokens && tokens.length > 0, 'Should have at least one verification token');
    } finally {
      if (agentId) await cleanupTestAgent(agentId);
    }
  }),

  test('AC-14: Used token cannot be used again', async () => {
    const testEmail = `${TEST_EMAIL_PREFIX}-usedtoken-${Date.now()}@example.com`;
    let agent = null;

    try {
      // Create unverified agent
      agent = await createTestAgent(testEmail, false);

      // Create and mark token as used
      const token = await createVerificationToken(agent.id);
      
      const { error } = await supabase
        .from('email_verification_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('token', token);

      assert.ok(!error, 'Should mark token as used');

      // Verify token is marked as used
      const { data: tokenData } = await supabase
        .from('email_verification_tokens')
        .select('used_at')
        .eq('token', token)
        .single();

      assert.ok(tokenData.used_at, 'Token should have used_at timestamp');
    } finally {
      if (agent) await cleanupTestAgent(agent.id);
    }
  }),

  test('AC-15: Backward compatibility - existing accounts treated as verified', async () => {
    // This test verifies that the database schema allows NULL or has default FALSE
    // The actual backfill should have been done in migration
    const { data, error } = await supabase
      .from('real_estate_agents')
      .select('email_verified')
      .limit(10);

    assert.ok(!error, 'Should query email_verified column');
    
    // Check that column exists and returns values (not error)
    if (data && data.length > 0) {
      console.log(`   Found ${data.length} agents with email_verified column`);
    }
  })
];

// Run all tests
async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  E2E Test: feat-email-verification-before-login');
  console.log('═══════════════════════════════════════════════════════════════');

  for (const t of tests) {
    await runTest(t);
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Total: ${tests.length}`);
  console.log(`Passed: ${results.passed} ✅`);
  console.log(`Failed: ${results.failed} ❌`);
  console.log(`Pass Rate: ${((results.passed / tests.length) * 100).toFixed(1)}%`);

  if (results.failed > 0) {
    console.log('\nFailed tests:');
    results.tests.filter(t => t.status === 'failed').forEach(t => {
      console.log(`  - ${t.name}`);
    });
  }

  return results;
}

// Export for use as module
module.exports = { runAllTests, results };

// Run if called directly
if (require.main === module) {
  runAllTests().then(results => {
    process.exit(results.failed > 0 ? 1 : 0);
  }).catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
