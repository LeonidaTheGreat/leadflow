#!/usr/bin/env node
// =============================================================================
// Twilio Environment Variables Verification Script
// =============================================================================
// Usage: node scripts/utilities/verify-twilio-env.js
// Verifies that required Twilio env vars are available locally.
// =============================================================================

const fs = require('fs');

console.log('==============================================');
console.log('Twilio Environment Variables Verification');
console.log('==============================================\n');

const requiredVars = [
  { name: 'TWILIO_ACCOUNT_SID', sensitive: true },
  { name: 'TWILIO_AUTH_TOKEN', sensitive: true },
  { name: 'TWILIO_PHONE_NUMBER_US', sensitive: true },
];

const deprecatedVars = [
  { name: 'AUTH_TOKEN', reason: 'Use TWILIO_AUTH_TOKEN' },
  { name: 'PHONE_NUMBER_US', reason: 'Use TWILIO_PHONE_NUMBER_US' },
  { name: 'TWILIO_PHONE_NUMBER', reason: 'Use TWILIO_PHONE_NUMBER_US' },
];

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const envContent = fs.readFileSync(filePath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=').trim();
    if (key && value && !process.env[key.trim()]) {
      process.env[key.trim()] = value;
    }
  }
}

if (process.env.VERCEL !== '1') {
  loadEnvFile('.env.local');
}

let allPassed = true;

console.log('----------------------------------------------');
console.log('Checking Required Variables:');
console.log('----------------------------------------------\n');

for (const { name, sensitive } of requiredVars) {
  const value = process.env[name];
  if (!value) {
    console.log(`❌ ${name}: MISSING`);
    allPassed = false;
    continue;
  }

  if (value.includes('your_') || value.includes('replace_with') || value.includes('_here')) {
    console.log(`⚠️  ${name}: PLACEHOLDER VALUE (needs to be updated)`);
    allPassed = false;
    continue;
  }

  const displayValue = sensitive ? `${value.substring(0, 8)}...` : value;
  console.log(`✅ ${name}: ${displayValue}`);
}

console.log('\n----------------------------------------------');
console.log('Checking for Deprecated Variables:');
console.log('----------------------------------------------\n');

let foundDeprecated = false;
for (const { name, reason } of deprecatedVars) {
  if (!process.env[name]) {
    continue;
  }
  console.log(`⚠️  ${name}: IS SET but deprecated — ${reason}`);
  foundDeprecated = true;
}
if (!foundDeprecated) {
  console.log('✅ No deprecated variables found.');
}

console.log('\n==============================================');
if (allPassed) {
  console.log('✅ All required Twilio environment variables are configured!');
  console.log('==============================================\n');
  process.exit(0);
}

console.log('❌ Some Twilio environment variables are missing or invalid');
console.log('==============================================\n');
console.log('Next steps:');
console.log('1. Pull Twilio values from Vercel production:');
console.log('   bash scripts/shell/sync-twilio-env-local.sh');
console.log('2. Re-run verification:');
console.log('   node scripts/utilities/verify-twilio-env.js');
console.log('');
process.exit(1);
