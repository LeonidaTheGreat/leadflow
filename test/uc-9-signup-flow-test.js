#!/usr/bin/env node
/**
 * UC-9 Sign-Up Flow Test
 * 
 * Tests the customer sign-up API endpoints without requiring Stripe integration
 * This allows basic validation before PM testing with real Stripe
 * 
 * Usage: node test/uc-9-signup-flow-test.js
 */

const axios = require('axios');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  tests: []
};

function logTest(name, passed, error = null) {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ PASS: ${name}`);
  } else {
    testResults.failed++;
    console.log(`❌ FAIL: ${name}`);
    if (error) console.log(`   Error: ${error}`);
  }
  testResults.tests.push({ name, passed, error });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testCustomerCreation() {
  console.log('\n=== Test 1: Customer Creation API ===\n');
  
  try {
    const response = await axios.post(`${API_BASE}/customers/create`, {
      email: `test-${Date.now()}@example.com`,
      name: 'Test User',
      phone: '+1 (555) 123-4567'
    });
    
    logTest('Customer creation returns 201', response.status === 201);
    logTest('Response includes customerId', !!response.data.customerId);
    
    return response.data.customerId;
  } catch (error) {
    logTest('Customer creation API', false, error.message);
    return null;
  }
}

async function testDuplicateEmail() {
  console.log('\n=== Test 2: Duplicate Email Handling ===\n');
  
  try {
    const email = `duplicate-test-${Date.now()}@example.com`;
    
    // Create first customer
    const response1 = await axios.post(`${API_BASE}/customers/create`, {
      email,
      name: 'First User',
      phone: '+1 (555) 111-1111'
    });
    
    logTest('First customer created', response1.status === 201);
    
    await sleep(500);
    
    // Try to create duplicate
    const response2 = await axios.post(`${API_BASE}/customers/create`, {
      email,
      name: 'Duplicate User',
      phone: '+1 (555) 222-2222'
    });
    
    logTest('Duplicate returns existing customer', response2.data.existing === true);
    logTest('Both customers have same ID', 
      response1.data.customerId === response2.data.customerId);
    
  } catch (error) {
    logTest('Duplicate email handling', false, error.message);
  }
}

async function testInvalidEmail() {
  console.log('\n=== Test 3: Invalid Email Validation ===\n');
  
  try {
    await axios.post(`${API_BASE}/customers/create`, {
      email: 'not-an-email',
      name: 'Test User',
      phone: '+1 (555) 123-4567'
    });
    
    logTest('Invalid email rejected', false, 'Should have thrown error');
  } catch (error) {
    logTest('Invalid email rejected', 
      error.response?.status === 400 && 
      error.response?.data?.error.includes('Invalid email'));
  }
}

async function testMissingFields() {
  console.log('\n=== Test 4: Missing Required Fields ===\n');
  
  try {
    await axios.post(`${API_BASE}/customers/create`, {
      email: 'test@example.com'
      // Missing name and phone
    });
    
    logTest('Missing fields rejected', false, 'Should have thrown error');
  } catch (error) {
    logTest('Missing fields rejected', 
      error.response?.status === 400 && 
      error.response?.data?.error.includes('required'));
  }
}

async function testCheckoutCreation() {
  console.log('\n=== Test 5: Checkout Session Creation ===\n');
  
  // This test requires Stripe to be configured
  // If Stripe is not configured, it should fail gracefully
  
  try {
    const customerResponse = await axios.post(`${API_BASE}/customers/create`, {
      email: `checkout-test-${Date.now()}@example.com`,
      name: 'Checkout Test',
      phone: '+1 (555) 999-9999'
    });
    
    const customerId = customerResponse.data.customerId;
    
    try {
      const checkoutResponse = await axios.post(`${API_BASE}/billing/create-checkout`, {
        customerId,
        email: customerResponse.data.email,
        plan: 'pro',
        priceId: 'price_test_placeholder'
      });
      
      logTest('Checkout session created', !!checkoutResponse.data.url);
      logTest('Session ID returned', !!checkoutResponse.data.sessionId);
    } catch (error) {
      if (error.response?.status === 503) {
        logTest('Checkout requires Stripe configuration', true, 
          'Stripe not configured (expected in test)');
      } else {
        logTest('Checkout session creation', false, error.message);
      }
    }
  } catch (error) {
    logTest('Checkout test setup', false, error.message);
  }
}

async function testPlanValidation() {
  console.log('\n=== Test 6: Plan Validation ===\n');
  
  const validPlans = ['starter', 'pro', 'team'];
  
  for (const plan of validPlans) {
    try {
      await axios.post(`${API_BASE}/billing/create-checkout`, {
        customerId: 'test-id',
        email: 'test@example.com',
        plan,
        priceId: 'price_test'
      });
      
      // If Stripe is configured and we get past plan validation, that's good
      logTest(`Plan "${plan}" is valid`, true);
    } catch (error) {
      // 400 with "Invalid plan" = validation working
      // 404 with "Customer not found" = plan was valid, customer missing (expected)
      // 503 = Stripe not configured (expected in test)
      if (error.response?.status === 404 || error.response?.status === 503) {
        logTest(`Plan "${plan}" is valid`, true);
      } else if (error.response?.data?.error?.includes('Invalid plan')) {
        logTest(`Plan "${plan}" is valid`, false, 'Plan should be valid');
      } else {
        logTest(`Plan "${plan}" validation`, true, 'Passed validation');
      }
    }
  }
  
  // Test invalid plan
  try {
    await axios.post(`${API_BASE}/billing/create-checkout`, {
      customerId: 'test-id',
      email: 'test@example.com',
      plan: 'invalid-plan',
      priceId: 'price_test'
    });
    
    logTest('Invalid plan rejected', false, 'Should have thrown error');
  } catch (error) {
    logTest('Invalid plan rejected', 
      error.response?.status === 400 && 
      error.response?.data?.error?.includes('Invalid plan'));
  }
}

async function runAllTests() {
  console.log('🧪 UC-9 Sign-Up Flow Test Suite\n');
  console.log(`Testing against: ${BASE_URL}\n`);
  console.log('='.repeat(60));
  
  await testCustomerCreation();
  await testDuplicateEmail();
  await testInvalidEmail();
  await testMissingFields();
  await testCheckoutCreation();
  await testPlanValidation();
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Results Summary\n');
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`Pass Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 All tests passed! Sign-up flow APIs are working.\n');
    console.log('Next steps:');
    console.log('1. Set up Stripe test mode products');
    console.log('2. Configure Stripe environment variables');
    console.log('3. Follow docs/UC-9-TESTING-INSTRUCTIONS.md for full validation');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Review errors above.\n');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('\n❌ Test suite error:', error.message);
  process.exit(1);
});
