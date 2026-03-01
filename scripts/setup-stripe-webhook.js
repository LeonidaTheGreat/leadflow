#!/usr/bin/env node
/**
 * Stripe Webhook Setup Helper
 * Run this after configuring webhooks in Stripe Dashboard
 * 
 * Usage: node scripts/setup-stripe-webhook.js <webhook_secret>
 */

const fs = require('fs');
const path = require('path');

const WEBHOOK_SECRET = process.argv[2];

if (!WEBHOOK_SECRET || !WEBHOOK_SECRET.startsWith('whsec_')) {
  console.error('❌ Error: Please provide a valid Stripe webhook signing secret');
  console.error('Usage: node scripts/setup-stripe-webhook.js whsec_your_secret_here');
  process.exit(1);
}

const envLocalPath = path.join(__dirname, '..', '.env.local');

if (!fs.existsSync(envLocalPath)) {
  console.error('❌ Error: .env.local file not found');
  process.exit(1);
}

let envContent = fs.readFileSync(envLocalPath, 'utf8');

// Replace the webhook secret
const oldPattern = /STRIPE_WEBHOOK_SECRET=.*/;
const newLine = `STRIPE_WEBHOOK_SECRET=${WEBHOOK_SECRET}`;

if (oldPattern.test(envContent)) {
  envContent = envContent.replace(oldPattern, newLine);
  fs.writeFileSync(envLocalPath, envContent);
  console.log('✅ STRIPE_WEBHOOK_SECRET updated in .env.local');
} else {
  console.error('❌ Error: STRIPE_WEBHOOK_SECRET not found in .env.local');
  process.exit(1);
}

console.log('\n📋 Next Steps:');
console.log('1. Deploy the updated environment variables to Vercel:');
console.log('   vercel env add STRIPE_WEBHOOK_SECRET');
console.log('2. Or update via Vercel Dashboard > Project Settings > Environment Variables');
console.log('3. Test the webhook by triggering a checkout session');
