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

// Required environment variables (must match PRICE_ID_ENV_MAP in create-checkout/route.ts)
const requiredVars = [
  { name: 'STRIPE_SECRET_KEY', sensitive: true },
  { name: 'STRIPE_WEBHOOK_SECRET', sensitive: true },
  // Server-side price IDs — these are the authoritative names
  { name: 'STRIPE_PRICE_STARTER_MONTHLY', sensitive: false },
  { name: 'STRIPE_PRICE_PROFESSIONAL_MONTHLY', sensitive: false },
  { name: 'STRIPE_PRICE_ENTERPRISE_MONTHLY', sensitive: false },
];

// Deprecated / incorrect vars that should NOT be used
const deprecatedVars = [
  { name: 'NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTHLY',  reason: 'Use STRIPE_PRICE_STARTER_MONTHLY (server-side)' },
  { name: 'NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY',      reason: 'Use STRIPE_PRICE_PROFESSIONAL_MONTHLY (server-side)' },
  { name: 'NEXT_PUBLIC_STRIPE_PRICE_TEAM_MONTHLY',     reason: 'Use STRIPE_PRICE_ENTERPRISE_MONTHLY (server-side)' },
  { name: 'STRIPE_PRICE_ID_BASIC',       reason: 'Use STRIPE_PRICE_STARTER_MONTHLY' },
  { name: 'STRIPE_PRICE_ID_PRO',         reason: 'Use STRIPE_PRICE_PROFESSIONAL_MONTHLY' },
  { name: 'STRIPE_PRICE_ID_ENTERPRISE',  reason: 'Use STRIPE_PRICE_ENTERPRISE_MONTHLY' },
];

// Kept for backward compat (empty — no longer used)
const legacyMappings = [];

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

// Check for deprecated / incorrectly named vars
console.log('\n----------------------------------------------');
console.log('Checking for Deprecated Variables:');
console.log('----------------------------------------------\n');

let foundDeprecated = false;
for (const { name, reason } of deprecatedVars) {
  if (process.env[name]) {
    console.log(`⚠️  ${name}: IS SET but deprecated — ${reason}`);
    console.log(`   Remove it from Vercel and set the correct var instead.`);
    foundDeprecated = true;
  }
}
if (!foundDeprecated) {
  console.log('✅ No deprecated variables found.');
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
  console.log('1. Create Stripe products and prices:');
  console.log('   STRIPE_SECRET_KEY=sk_test_... node scripts/utilities/create-stripe-products.js');
  console.log('2. Copy the price_... IDs output by the script');
  console.log('3. Set them in Vercel:');
  console.log('   echo "price_..." | vercel env add STRIPE_PRICE_STARTER_MONTHLY production');
  console.log('   echo "price_..." | vercel env add STRIPE_PRICE_PROFESSIONAL_MONTHLY production');
  console.log('   echo "price_..." | vercel env add STRIPE_PRICE_ENTERPRISE_MONTHLY production');
  console.log('4. Also set: STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in Vercel');
  console.log('5. Redeploy: vercel --prod');
  console.log('6. Run: node scripts/utilities/verify-stripe-env.js again to verify');
  console.log('');
  
  process.exit(1);
}
