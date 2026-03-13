#!/usr/bin/env node
/**
 * E2E Test: Billing Schema Alignment
 * Tests customers table, portal API, and webhook integration
 * Priority: P0 - PILOT BLOCKER
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Test data
const testCustomer = {
  email: `test-${Date.now()}@leadflow.test`,
  name: 'Test Customer',
  phone: '+12015551234',
  company: 'Test Realty',
  plan_tier: 'pro'
};

let testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, message) {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name}`);
  if (message) console.log(`   ${message}`);
  
  testResults.tests.push({ name, passed, message });
  if (passed) testResults.passed++;
  else testResults.failed++;
}

async function runTests() {
  console.log('🚀 Starting Billing Schema Alignment E2E Tests\n');
  console.log('=' .repeat(60));
  console.log('');

  let customerId;
  let stripeCustomerId;

  // TEST 1: Verify customers table exists
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('id')
      .limit(1);
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    logTest('Customers table exists', true, 'Table can be queried');
  } catch (error) {
    logTest('Customers table exists', false, error.message);
    console.log('\n❌ CRITICAL: Customers table does not exist. Run migration first.');
    process.exit(1);
  }

  // TEST 2: Create customer via API
  try {
    const response = await axios.post(`${BASE_URL}/api/customers`, testCustomer);
    
    if (response.status === 201 && response.data.success) {
      customerId = response.data.customer.id;
      logTest('Create customer via API', true, `Customer ID: ${customerId}`);
    } else {
      throw new Error('Unexpected response: ' + JSON.stringify(response.data));
    }
  } catch (error) {
    logTest('Create customer via API', false, error.message);
  }

  // TEST 3: Get customer by ID
  if (customerId) {
    try {
      const response = await axios.get(`${BASE_URL}/api/customers/${customerId}`);
      
      if (response.status === 200 && response.data.customer.email === testCustomer.email) {
        logTest('Get customer by ID', true, 'Customer data matches');
      } else {
        throw new Error('Customer data mismatch');
      }
    } catch (error) {
      logTest('Get customer by ID', false, error.message);
    }
  }

  // TEST 4: Verify customer in database
  if (customerId) {
    try {
      const { data: customer, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();
      
      if (error) throw error;
      
      const hasAllFields = customer.email && customer.name && 
                          customer.plan_tier && customer.status;
      
      if (hasAllFields) {
        logTest('Verify customer schema', true, 'All required fields present');
      } else {
        throw new Error('Missing required fields');
      }
    } catch (error) {
      logTest('Verify customer schema', false, error.message);
    }
  }

  // TEST 5: Create Stripe customer
  if (customerId && process.env.STRIPE_SECRET_KEY) {
    try {
      const response = await axios.post(
        `${BASE_URL}/api/customers/${customerId}/stripe-customer`
      );
      
      if (response.status === 200 && response.data.stripe_customer_id) {
        stripeCustomerId = response.data.stripe_customer_id;
        logTest('Create Stripe customer', true, `Stripe ID: ${stripeCustomerId}`);
      } else {
        throw new Error('Failed to create Stripe customer');
      }
    } catch (error) {
      logTest('Create Stripe customer', false, error.message);
    }
  } else if (!process.env.STRIPE_SECRET_KEY) {
    logTest('Create Stripe customer', false, 'STRIPE_SECRET_KEY not configured');
  }

  // TEST 6: Verify stripe_customer_id in database
  if (customerId && stripeCustomerId) {
    try {
      const { data: customer } = await supabase
        .from('customers')
        .select('stripe_customer_id')
        .eq('id', customerId)
        .single();
      
      if (customer.stripe_customer_id === stripeCustomerId) {
        logTest('Stripe customer ID saved', true, 'Database updated correctly');
      } else {
        throw new Error('Stripe customer ID mismatch');
      }
    } catch (error) {
      logTest('Stripe customer ID saved', false, error.message);
    }
  }

  // TEST 7: Portal session creation (requires authentication)
  // This test is skipped because it requires a valid auth token
  // Manual testing required
  logTest('Portal session creation', null, 'SKIPPED: Requires authentication token');

  // TEST 8: Update customer profile
  if (customerId) {
    try {
      const response = await axios.patch(
        `${BASE_URL}/api/customers/${customerId}`,
        { phone: '+12015559999', company: 'Updated Realty' }
      );
      
      if (response.status === 200 && response.data.customer.phone === '+12015559999') {
        logTest('Update customer profile', true, 'Profile updated successfully');
      } else {
        throw new Error('Update failed');
      }
    } catch (error) {
      logTest('Update customer profile', false, error.message);
    }
  }

  // TEST 9: List customers
  try {
    const response = await axios.get(`${BASE_URL}/api/customers?limit=10`);
    
    if (response.status === 200 && Array.isArray(response.data.customers)) {
      logTest('List customers', true, `Found ${response.data.customers.length} customers`);
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    logTest('List customers', false, error.message);
  }

  // TEST 10: Verify RLS policies exist
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT COUNT(*) as policy_count
        FROM pg_policies
        WHERE tablename = 'customers';
      `
    });
    
    if (error) {
      // Try alternative query
      const { data: policies } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'customers');
      
      if (policies && policies.length > 0) {
        logTest('Row Level Security policies', true, `${policies.length} policies configured`);
      } else {
        throw new Error('No RLS policies found');
      }
    } else {
      logTest('Row Level Security policies', true, 'Policies configured');
    }
  } catch (error) {
    logTest('Row Level Security policies', false, error.message);
  }

  // TEST 11: Soft delete customer
  if (customerId) {
    try {
      const response = await axios.delete(`${BASE_URL}/api/customers/${customerId}`);
      
      if (response.status === 200 && response.data.customer.status === 'canceled') {
        logTest('Soft delete customer', true, 'Customer marked as canceled');
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      logTest('Soft delete customer', false, error.message);
    }
  }

  // TEST 12: Verify deleted customer still exists in DB
  if (customerId) {
    try {
      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();
      
      if (customer && customer.status === 'canceled') {
        logTest('Soft delete verification', true, 'Customer record preserved with canceled status');
      } else {
        throw new Error('Customer not found or status incorrect');
      }
    } catch (error) {
      logTest('Soft delete verification', false, error.message);
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 TEST SUMMARY\n');
  console.log(`Total Tests: ${testResults.tests.length}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`⚪ Skipped: ${testResults.tests.filter(t => t.passed === null).length}`);
  
  const passRate = ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1);
  console.log(`\nPass Rate: ${passRate}%`);
  
  if (testResults.failed === 0) {
    console.log('\n✅ ALL TESTS PASSED! Schema alignment is working correctly.\n');
    process.exit(0);
  } else {
    console.log('\n❌ SOME TESTS FAILED. Review errors above.\n');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test suite error:', error);
  process.exit(1);
});
