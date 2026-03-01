#!/usr/bin/env node
/**
 * Stripe Webhook Test Script
 * Tests the webhook endpoint configuration
 * 
 * Usage: node scripts/test-stripe-webhook.js
 */

const https = require('https');
const http = require('http');
const url = require('url');

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://leadflow-dev.vercel.app/api/webhooks/stripe';
const TEST_SECRET = 'whsec_test_secret_for_validation_only';

console.log('🔍 Testing Stripe Webhook Configuration');
console.log('=====================================\n');
console.log(`Webhook URL: ${WEBHOOK_URL}\n`);

// Test 1: Check if endpoint is reachable
async function testEndpointReachable() {
  console.log('Test 1: Endpoint Reachability');
  console.log('------------------------------');
  
  return new Promise((resolve) => {
    const parsedUrl = new URL(WEBHOOK_URL);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': 'test_signature',
      },
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // We expect a 400 (bad signature) or 200 if it accepts test data
        if (res.statusCode === 400) {
          console.log('✅ Endpoint is reachable and validates signatures\n');
          resolve(true);
        } else if (res.statusCode === 503) {
          console.log('⚠️  Endpoint reachable but Stripe not configured');
          console.log('   Make sure STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are set\n');
          resolve(false);
        } else if (res.statusCode === 500) {
          console.log('⚠️  Endpoint reachable but returned 500');
          console.log('   Response:', data, '\n');
          resolve(false);
        } else {
          console.log(`⚠️  Endpoint returned status ${res.statusCode}`);
          console.log('   Response:', data, '\n');
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.log(`❌ Cannot reach endpoint: ${err.message}\n`);
      resolve(false);
    });

    req.write(JSON.stringify({ test: true }));
    req.end();
  });
}

// Test 2: Verify environment variables
async function testEnvironmentVariables() {
  console.log('Test 2: Environment Variables');
  console.log('------------------------------');
  
  const required = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET'
  ];
  
  let allPresent = true;
  
  for (const envVar of required) {
    const value = process.env[envVar];
    if (value && !value.includes('your_') && !value.includes('placeholder')) {
      const masked = value.substring(0, 8) + '...' + value.substring(value.length - 4);
      console.log(`✅ ${envVar}: ${masked}`);
    } else {
      console.log(`❌ ${envVar}: Not configured or has placeholder value`);
      allPresent = false;
    }
  }
  
  console.log();
  return allPresent;
}

// Test 3: Stripe events to configure
async function listRequiredEvents() {
  console.log('Test 3: Required Stripe Events');
  console.log('------------------------------');
  
  const events = [
    { name: 'checkout.session.completed', required: true, description: 'New subscription created' },
    { name: 'customer.subscription.updated', required: true, description: 'Subscription plan/tier changed' },
    { name: 'customer.subscription.deleted', required: true, description: 'Subscription cancelled' },
    { name: 'invoice.paid', required: true, description: 'Payment received' },
  ];
  
  for (const event of events) {
    console.log(`${event.required ? '✅' : '⏭️'} ${event.name}`);
    console.log(`   ${event.description}`);
  }
  
  console.log();
}

// Run all tests
async function runTests() {
  console.log('Starting webhook configuration tests...\n');
  
  await testEnvironmentVariables();
  await listRequiredEvents();
  await testEndpointReachable();
  
  console.log('=====================================');
  console.log('📋 Next Steps:');
  console.log('=====================================');
  console.log('1. Configure webhook in Stripe Dashboard:');
  console.log('   https://dashboard.stripe.com/test/webhooks');
  console.log('');
  console.log('2. Add endpoint URL:');
  console.log(`   ${WEBHOOK_URL}`);
  console.log('');
  console.log('3. Select these events:');
  console.log('   - checkout.session.completed');
  console.log('   - customer.subscription.updated');
  console.log('   - customer.subscription.deleted');
  console.log('   - invoice.paid');
  console.log('');
  console.log('4. Copy the signing secret (whsec_...) and update:');
  console.log('   - .env.local file (local development)');
  console.log('   - Vercel environment variables (production)');
  console.log('');
  console.log('5. To update .env.local:');
  console.log('   node scripts/setup-stripe-webhook.js <your_webhook_secret>');
  console.log('');
  console.log('6. Test the webhook with Stripe CLI:');
  console.log('   stripe trigger checkout.session.completed');
  console.log('');
}

runTests().catch(console.error);
