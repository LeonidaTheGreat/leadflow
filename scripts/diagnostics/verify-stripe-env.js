#!/usr/bin/env node
// =============================================================================
// Stripe Environment Variables Verification Script
// =============================================================================
// Usage: node verify-stripe-env.js
// Verifies that all required Stripe environment variables are accessible
// =============================================================================

const fs = require('fs');
const path = require('path');

console.log('==============================================');
console.log('Stripe Environment Variables Verification');
console.log('==============================================\n');

// Required environment variables
const requiredVars = [
  { name: 'STRIPE_SECRET_KEY', sensitive: true },
  { name: 'STRIPE_WEBHOOK_SECRET', sensitive: true },
  { name: 'STRIPE_PRICE_ID_BASIC', sensitive: false },
  { name: 'STRIPE_PRICE_ID_PRO', sensitive: false },
  { name: 'STRIPE_PRICE_ID_ENTERPRISE', sensitive: false }
];

// Legacy aliases that should match
const legacyMappings = [
  { legacy: 'STRIPE_PRICE_STARTER_MONTHLY', current: 'STRIPE_PRICE_ID_BASIC' },
  { legacy: 'STRIPE_PRICE_PROFESSIONAL_MONTHLY', current: 'STRIPE_PRICE_ID_PRO' },
  { legacy: 'STRIPE_PRICE_ENTERPRISE_MONTHLY', current: 'STRIPE_PRICE_ID_ENTERPRISE' }
];

let allPassed = true;

// Check if running in Vercel production
const isVercelProduction = process.env.VERCEL === '1' && process.env.VERCEL_ENV === 'production';
const isLocal = !isVercelProduction;

console.log(`Environment: ${isVercelProduction ? 'Vercel Production' : 'Local Development'}\n`);

// Load .env.local if it exists and we're local
if (isLocal && fs.existsSync('.env.local')) {
  console.log('Loading .env.local file...\n');
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const envLines = envContent.split('\n');
  
  for (const line of envLines) {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').trim();
      if (key && value && !process.env[key.trim()]) {
        process.env[key.trim()] = value;
      }
    }
  }
}

// Verify required variables
console.log('----------------------------------------------');
console.log('Checking Required Variables:');
console.log('----------------------------------------------\n');

for (const { name, sensitive } of requiredVars) {
  const value = process.env[name];
  
  if (!value) {
    console.log(`❌ ${name}: MISSING`);
    allPassed = false;
  } else if (value.includes('replace_with') || value.includes('your_') || value.includes('_here')) {
    console.log(`⚠️  ${name}: PLACEHOLDER VALUE (needs to be updated)`);
    console.log(`   Current: ${value}`);
    allPassed = false;
  } else {
    const displayValue = sensitive 
      ? `${value.substring(0, 12)}...` 
      : value;
    console.log(`✅ ${name}: ${displayValue}`);
  }
}

// Check legacy aliases
console.log('\n----------------------------------------------');
console.log('Checking Legacy Aliases:');
console.log('----------------------------------------------\n');

for (const { legacy, current } of legacyMappings) {
  const legacyValue = process.env[legacy];
  const currentValue = process.env[current];
  
  if (!legacyValue) {
    console.log(`⚠️  ${legacy}: NOT SET (optional but recommended)`);
  } else if (currentValue && legacyValue !== currentValue) {
    console.log(`⚠️  ${legacy}: MISMATCH with ${current}`);
    console.log(`   ${legacy}: ${legacyValue}`);
    console.log(`   ${current}: ${currentValue}`);
  } else {
    console.log(`✅ ${legacy}: ${legacyValue}`);
  }
}

// Summary
console.log('\n==============================================');
if (allPassed) {
  console.log('✅ All required Stripe environment variables are configured!');
  console.log('==============================================\n');
  
  // Test Stripe connectivity if sk_test_ key is present
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (stripeKey && stripeKey.startsWith('sk_test_')) {
    console.log('🧪 Test mode detected - ready for testing');
  } else if (stripeKey && stripeKey.startsWith('sk_live_')) {
    console.log('⚠️  LIVE MODE detected - use caution!');
  }
  
  process.exit(0);
} else {
  console.log('❌ Some environment variables are missing or need configuration');
  console.log('==============================================\n');
  
  console.log('Next steps:');
  console.log('1. Log into Stripe Dashboard: https://dashboard.stripe.com/test/products');
  console.log('2. Copy the Price IDs for your plans:');
  console.log('   - Basic ($29) plan');
  console.log('   - Pro ($149) plan');
  console.log('   - Enterprise ($499) plan');
  console.log('3. Update .env.local with the actual Price IDs');
  console.log('4. Run: ./setup-stripe-env-production.sh to add to Vercel');
  console.log('5. Run: node verify-stripe-env.js again to verify');
  console.log('');
  
  process.exit(1);
}
