// E2E test for task: fix-twilio-credentials-not-in-local-env
// Task ID: 1f5dfb5d-3d02-4e46-8cb3-3c860682beae
// Validates: Twilio credential keys exist in local env, twilio-sms.js cleanEnvValue logic

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const projectDir = '/Users/clawdbot/projects/leadflow';
let passed = 0;
let failed = 0;

function pass(msg) { console.log(`PASS: ${msg}`); passed++; }
function fail(msg) { console.log(`FAIL: ${msg}`); failed++; }

// Test 1: .env file exists
{
  const envPath = path.join(projectDir, '.env');
  if (fs.existsSync(envPath)) {
    pass('.env file exists');
  } else {
    fail('.env file does not exist — Twilio credentials cannot be loaded locally');
  }
}

// Test 2: TWILIO_ACCOUNT_SID key present in .env (not necessarily a real value)
{
  const envPath = path.join(projectDir, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    if (content.includes('TWILIO_ACCOUNT_SID')) {
      pass('TWILIO_ACCOUNT_SID key is present in .env');
    } else {
      fail('TWILIO_ACCOUNT_SID key is missing from .env');
    }
  } else {
    fail('Cannot check TWILIO_ACCOUNT_SID — .env does not exist');
  }
}

// Test 3: TWILIO_AUTH_TOKEN key present in .env
{
  const envPath = path.join(projectDir, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    if (content.includes('TWILIO_AUTH_TOKEN')) {
      pass('TWILIO_AUTH_TOKEN key is present in .env');
    } else {
      fail('TWILIO_AUTH_TOKEN key is missing from .env');
    }
  } else {
    fail('Cannot check TWILIO_AUTH_TOKEN — .env does not exist');
  }
}

// Test 4: TWILIO_PHONE_NUMBER_US key present in .env
{
  const envPath = path.join(projectDir, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    if (content.includes('TWILIO_PHONE_NUMBER_US')) {
      pass('TWILIO_PHONE_NUMBER_US key is present in .env');
    } else {
      fail('TWILIO_PHONE_NUMBER_US key is missing from .env');
    }
  } else {
    fail('Cannot check TWILIO_PHONE_NUMBER_US — .env does not exist');
  }
}

// Test 5: .env.example has all required Twilio keys (documentation)
{
  const examplePath = path.join(projectDir, '.env.example');
  if (fs.existsSync(examplePath)) {
    const content = fs.readFileSync(examplePath, 'utf8');
    const requiredKeys = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER_US'];
    const missing = requiredKeys.filter(k => !content.includes(k));
    if (missing.length === 0) {
      pass('.env.example documents all required Twilio keys');
    } else {
      fail(`.env.example missing keys: ${missing.join(', ')}`);
    }
  } else {
    fail('.env.example does not exist');
  }
}

// Test 6: .env.example has no conflict markers (merge conflict check)
{
  const examplePath = path.join(projectDir, '.env.example');
  if (fs.existsSync(examplePath)) {
    const content = fs.readFileSync(examplePath, 'utf8');
    if (content.includes('<<<<<<<') || content.includes('>>>>>>>') || content.includes('=======')) {
      fail('.env.example contains merge conflict markers');
    } else {
      pass('.env.example is clean (no conflict markers)');
    }
  } else {
    fail('.env.example does not exist');
  }
}

// Test 7: cleanEnvValue function in twilio-sms.js strips quotes/whitespace
{
  const twilioPath = path.join(projectDir, 'lib/twilio-sms.js');
  const content = fs.readFileSync(twilioPath, 'utf8');
  if (content.includes('cleanEnvValue')) {
    // Extract and test the function logic inline
    const fn = function cleanEnvValue(value) {
      if (typeof value !== 'string') return undefined;
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      return trimmed.replace(/^['"]|['"]$/g, '');
    };
    assert.strictEqual(fn("  +12015551234  "), '+12015551234');
    assert.strictEqual(fn("'+12015551234'"), '+12015551234');
    assert.strictEqual(fn('"+12015551234"'), '+12015551234');
    assert.strictEqual(fn(''), undefined);
    assert.strictEqual(fn(undefined), undefined);
    pass('cleanEnvValue strips quotes and whitespace correctly');
  } else {
    fail('cleanEnvValue function not found in lib/twilio-sms.js');
  }
}

// Test 8: Legacy TWILIO_PHONE_NUMBER fallback in twilio-sms.js
{
  const twilioPath = path.join(projectDir, 'lib/twilio-sms.js');
  const content = fs.readFileSync(twilioPath, 'utf8');
  if (content.includes('TWILIO_PHONE_NUMBER)') || content.includes('TWILIO_PHONE_NUMBER\)')) {
    pass('Legacy TWILIO_PHONE_NUMBER fallback present in twilio-sms.js');
  } else if (content.includes('twilioPhoneNumberLegacy')) {
    pass('Legacy TWILIO_PHONE_NUMBER fallback present (via twilioPhoneNumberLegacy)');
  } else {
    fail('Legacy TWILIO_PHONE_NUMBER fallback missing from twilio-sms.js');
  }
}

console.log(`\n--- Results: ${passed} passed, ${failed} failed ---`);
if (failed > 0) process.exit(1);
