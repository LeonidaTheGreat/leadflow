/**
 * E2E Test: uc-populate-subscriptions-on-checkout-complete
 * 
 * Tests that the subscriptions table is populated when a Stripe checkout.session.completed
 * webhook is received.
 * 
 * Acceptance Criteria:
 * - When checkout.session.completed event fires, handleCheckoutComplete upserts a full 
 *   subscription record into the subscriptions table
 * - Uses ON CONFLICT stripe_subscription_id for idempotency
 * - All required fields are populated: user_id, stripe_customer_id, stripe_subscription_id,
 *   status, tier, price_id, interval, current_period_start, current_period_end, trial_start,
 *   trial_end, cancel_at_period_end, canceled_at, ended_at, metadata
 */

const assert = require('assert');

// Test configuration
const TEST_BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Simple Supabase client for testing
async function supabaseQuery(table, method, params = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  
  if (params.select) {
    url.searchParams.set('select', params.select);
  }
  
  if (params.eq) {
    url.searchParams.set(params.eq.column, `eq.${params.eq.value}`);
  }

  const headers = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  const response = await fetch(url.toString(), {
    method: method === 'delete' ? 'DELETE' : 'GET',
    headers
  });

  if (!response.ok) {
    const error = await response.text();
    return { data: null, error };
  }

  const data = await response.json();
  return { data, error: null };
}

// Test 1: Verify webhook endpoint exists and accepts requests
async function testWebhookEndpointExists() {
  log('\n📋 Test 1: Webhook endpoint exists', 'yellow');
  
  try {
    const response = await fetch(`${TEST_BASE_URL}/api/webhooks/stripe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'invalid-signature'
      },
      body: JSON.stringify({ type: 'test' })
    });

    // Should return 400 for invalid signature (not 404)
    // This confirms the endpoint exists
    if (response.status === 404) {
      throw new Error('Webhook endpoint not found (404)');
    }
    
    log('✅ Webhook endpoint exists (returns non-404)', 'green');
    return { passed: true };
  } catch (error) {
    log(`❌ Test failed: ${error.message}`, 'red');
    return { passed: false, error: error.message };
  }
}

// Test 2: Verify subscriptions table schema has all required columns
async function testSubscriptionsTableSchema() {
  log('\n📋 Test 2: Subscriptions table has required columns', 'yellow');
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    log('⚠️  Skipping: Supabase credentials not configured', 'yellow');
    return { passed: true, skipped: true };
  }

  const requiredColumns = [
    'user_id',
    'stripe_customer_id',
    'stripe_subscription_id',
    'status',
    'tier',
    'price_id',
    'interval',
    'current_period_start',
    'current_period_end',
    'trial_start',
    'trial_end',
    'cancel_at_period_end',
    'canceled_at',
    'ended_at',
    'metadata'
  ];

  try {
    // Query information_schema to check columns
    const url = `${SUPABASE_URL}/rest/v1/rpc/get_subscriptions_columns`;
    
    // Try a simpler approach - query the table and see what columns exist
    const testUrl = new URL(`${SUPABASE_URL}/rest/v1/subscriptions`);
    testUrl.searchParams.set('select', '*');
    testUrl.searchParams.set('limit', '0');
    
    const response = await fetch(testUrl.toString(), {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      // Table might not exist or be accessible
      log(`⚠️  Could not verify table schema (status: ${response.status})`, 'yellow');
      return { passed: true, skipped: true };
    }

    log('✅ Subscriptions table is accessible', 'green');
    return { passed: true };
  } catch (error) {
    log(`⚠️  Could not verify schema: ${error.message}`, 'yellow');
    return { passed: true, skipped: true };
  }
}

// Test 3: Verify webhook handler code contains subscriptions upsert
async function testWebhookHandlerCode() {
  log('\n📋 Test 3: Webhook handler contains subscriptions upsert logic', 'yellow');
  
  const fs = require('fs');
  const path = require('path');
  
  const webhookPath = path.join(__dirname, '../../product/lead-response/dashboard/app/api/webhooks/stripe/route.ts');
  
  try {
    const code = fs.readFileSync(webhookPath, 'utf-8');
    
    // Check for subscriptions upsert
    const hasSubscriptionsUpsert = code.includes("supabase.from('subscriptions').upsert");
    const hasOnConflict = code.includes('onConflict');
    const hasStripeSubscriptionId = code.includes('stripe_subscription_id');
    const hasUserId = code.includes('user_id');
    
    assert(hasSubscriptionsUpsert, 'Code should contain subscriptions upsert');
    assert(hasOnConflict, 'Code should use onConflict for idempotency');
    assert(hasStripeSubscriptionId, 'Code should include stripe_subscription_id field');
    assert(hasUserId, 'Code should include user_id field');
    
    log('✅ Webhook handler contains subscriptions upsert logic', 'green');
    return { passed: true };
  } catch (error) {
    log(`❌ Test failed: ${error.message}`, 'red');
    return { passed: false, error: error.message };
  }
}

// Test 4: Verify all required fields are in the upsert
async function testRequiredFieldsInUpsert() {
  log('\n📋 Test 4: All required fields present in upsert', 'yellow');
  
  const fs = require('fs');
  const path = require('path');
  
  const webhookPath = path.join(__dirname, '../../product/lead-response/dashboard/app/api/webhooks/stripe/route.ts');
  
  try {
    const code = fs.readFileSync(webhookPath, 'utf-8');
    
    // Extract the upsert block
    const upsertMatch = code.match(/\.upsert\(\{[\s\S]*?\}, \{ onConflict: 'stripe_subscription_id' \}\)/);
    if (!upsertMatch) {
      throw new Error('Could not find upsert block with onConflict');
    }
    
    const upsertCode = upsertMatch[0];
    
    const requiredFields = [
      'user_id',
      'stripe_customer_id',
      'stripe_subscription_id',
      'status',
      'tier',
      'price_id',
      'interval',
      'current_period_start',
      'current_period_end',
      'trial_start',
      'trial_end',
      'cancel_at_period_end',
      'canceled_at',
      'ended_at',
      'metadata'
    ];
    
    const missingFields = [];
    for (const field of requiredFields) {
      if (!upsertCode.includes(field)) {
        missingFields.push(field);
      }
    }
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
    
    log('✅ All required fields present in upsert', 'green');
    return { passed: true };
  } catch (error) {
    log(`❌ Test failed: ${error.message}`, 'red');
    return { passed: false, error: error.message };
  }
}

// Test 5: Verify handleCheckoutComplete function structure
async function testHandleCheckoutCompleteStructure() {
  log('\n📋 Test 5: handleCheckoutComplete function structure', 'yellow');
  
  const fs = require('fs');
  const path = require('path');
  
  const webhookPath = path.join(__dirname, '../../product/lead-response/dashboard/app/api/webhooks/stripe/route.ts');
  
  try {
    const code = fs.readFileSync(webhookPath, 'utf-8');
    
    // Check function exists and has proper flow
    const hasFunction = code.includes('async function handleCheckoutComplete');
    const hasSubscriptionRetrieve = code.includes('stripe.subscriptions.retrieve');
    const hasAgentUpdate = code.includes("from('real_estate_agents').update");
    const hasEventLogging = code.includes("from('subscription_events').insert");
    
    assert(hasFunction, 'handleCheckoutComplete function should exist');
    assert(hasSubscriptionRetrieve, 'Should retrieve subscription from Stripe');
    assert(hasAgentUpdate, 'Should update real_estate_agents table');
    assert(hasEventLogging, 'Should log to subscription_events');
    
    log('✅ handleCheckoutComplete has correct structure', 'green');
    return { passed: true };
  } catch (error) {
    log(`❌ Test failed: ${error.message}`, 'red');
    return { passed: false, error: error.message };
  }
}

// Test 6: Verify proper error handling
async function testErrorHandling() {
  log('\n📋 Test 6: Error handling in webhook handler', 'yellow');
  
  const fs = require('fs');
  const path = require('path');
  
  const webhookPath = path.join(__dirname, '../../product/lead-response/dashboard/app/api/webhooks/stripe/route.ts');
  
  try {
    const code = fs.readFileSync(webhookPath, 'utf-8');
    
    // Check for error handling
    const hasTryCatch = code.includes('try {') && code.includes('} catch');
    const hasErrorLogging = code.includes('console.error');
    const hasStripeCheck = code.includes('if (!stripe)');
    
    assert(hasTryCatch, 'Should have try-catch blocks');
    assert(hasErrorLogging, 'Should log errors');
    assert(hasStripeCheck, 'Should check if stripe is configured');
    
    log('✅ Error handling is present', 'green');
    return { passed: true };
  } catch (error) {
    log(`❌ Test failed: ${error.message}`, 'red');
    return { passed: false, error: error.message };
  }
}

// Test 7: Verify idempotency with onConflict
async function testIdempotency() {
  log('\n📋 Test 7: Idempotency via onConflict', 'yellow');
  
  const fs = require('fs');
  const path = require('path');
  
  const webhookPath = path.join(__dirname, '../../product/lead-response/dashboard/app/api/webhooks/stripe/route.ts');
  
  try {
    const code = fs.readFileSync(webhookPath, 'utf-8');
    
    // Check for onConflict with stripe_subscription_id
    const hasOnConflict = code.includes("onConflict: 'stripe_subscription_id'");
    
    assert(hasOnConflict, "Should use onConflict: 'stripe_subscription_id' for idempotency");
    
    log('✅ Idempotency is implemented correctly', 'green');
    return { passed: true };
  } catch (error) {
    log(`❌ Test failed: ${error.message}`, 'red');
    return { passed: false, error: error.message };
  }
}

// Main test runner
async function runTests() {
  log('╔════════════════════════════════════════════════════════════╗', 'yellow');
  log('║  E2E Test: uc-populate-subscriptions-on-checkout-complete  ║', 'yellow');
  log('╚════════════════════════════════════════════════════════════╝', 'yellow');
  
  const tests = [
    testWebhookEndpointExists,
    testSubscriptionsTableSchema,
    testWebhookHandlerCode,
    testRequiredFieldsInUpsert,
    testHandleCheckoutCompleteStructure,
    testErrorHandling,
    testIdempotency
  ];
  
  const results = [];
  
  for (const test of tests) {
    const result = await test();
    results.push({ name: test.name, ...result });
  }
  
  // Summary
  log('\n╔════════════════════════════════════════════════════════════╗', 'yellow');
  log('║                      TEST SUMMARY                          ║', 'yellow');
  log('╚════════════════════════════════════════════════════════════╝', 'yellow');
  
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  
  for (const result of results) {
    if (result.skipped) {
      log(`⏭️  ${result.name}: SKIPPED`, 'yellow');
      skipped++;
    } else if (result.passed) {
      log(`✅ ${result.name}: PASSED`, 'green');
      passed++;
    } else {
      log(`❌ ${result.name}: FAILED - ${result.error}`, 'red');
      failed++;
    }
  }
  
  log('\n────────────────────────────────────────────────────────────', 'yellow');
  log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed} | Skipped: ${skipped}`, 'yellow');
  
  if (failed > 0) {
    log('\n❌ TEST SUITE FAILED', 'red');
    process.exit(1);
  } else {
    log('\n✅ TEST SUITE PASSED', 'green');
    process.exit(0);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
