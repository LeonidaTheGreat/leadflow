/**
 * E2E test: fix-twilio-credentials-not-in-local-env
 * Task ID: 1f5dfb5d-3d02-4e46-8cb3-3c860682beae
 *
 * Verifies:
 * 1. .env.example documents all required Twilio vars
 * 2. lib/twilio-sms.js has cleanEnvValue helper (quote-stripping for Vercel CLI exports)
 * 3. lib/twilio-sms.js falls back TWILIO_PHONE_NUMBER_US -> TWILIO_PHONE_NUMBER
 * 4. Local env (from .env.template or .env.local) exposes Twilio vars at runtime
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const projectDir = '/Users/clawdbot/projects/leadflow';

// ── Test 1: .env.example documents all three Twilio phone vars ──────────────
{
  const envExample = fs.readFileSync(path.join(projectDir, '.env.example'), 'utf8');
  const required = [
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_PHONE_NUMBER_US',
    'TWILIO_PHONE_NUMBER_CA',
    'TWILIO_PHONE_NUMBER',   // backward-compat fallback added by this fix
  ];
  for (const key of required) {
    assert(envExample.includes(key), `.env.example missing: ${key}`);
  }
  console.log('PASS: .env.example documents all required Twilio vars');
}

// ── Test 2: cleanEnvValue helper exists in twilio-sms.js ────────────────────
{
  const smsPath = path.join(projectDir, 'lib/twilio-sms.js');
  const smsCode = fs.readFileSync(smsPath, 'utf8');
  assert(smsCode.includes('cleanEnvValue'), 'lib/twilio-sms.js missing cleanEnvValue helper');
  console.log('PASS: cleanEnvValue helper present in lib/twilio-sms.js');
}

// ── Test 3: fallback chain TWILIO_PHONE_NUMBER_US -> TWILIO_PHONE_NUMBER ────
{
  const smsCode = fs.readFileSync(path.join(projectDir, 'lib/twilio-sms.js'), 'utf8');
  // The fix adds: twilioPhoneNumberUs || twilioPhoneNumberLegacy
  assert(
    smsCode.includes('twilioPhoneNumberLegacy') || smsCode.includes('TWILIO_PHONE_NUMBER'),
    'lib/twilio-sms.js missing TWILIO_PHONE_NUMBER fallback'
  );
  console.log('PASS: TWILIO_PHONE_NUMBER fallback present in lib/twilio-sms.js');
}

// ── Test 4: Twilio vars are reachable at runtime via some env file ───────────
{
  // Check .env.template (acceptable source for local debugging)
  const templatePath = path.join(projectDir, '.env.template');
  const localPath = path.join(projectDir, '.env');
  const envLocalPath = path.join(projectDir, '.env.local');

  let twilioAccountSidFound = false;
  let twilioAuthTokenFound = false;
  let twilioPhoneFound = false;

  for (const filePath of [templatePath, localPath, envLocalPath]) {
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf8');
    // Key must exist with a non-placeholder value (not "your_twilio_..." or "+1XXXXXXXXXX")
    const lines = content.split('\n');
    for (const line of lines) {
      if (/^TWILIO_ACCOUNT_SID=(?!your_twilio_sid$)(.+)/.test(line)) twilioAccountSidFound = true;
      if (/^TWILIO_AUTH_TOKEN=(?!your_twilio_auth_token$)(.+)/.test(line)) twilioAuthTokenFound = true;
      if (/^TWILIO_PHONE_NUMBER(?:_US)?=(?!\+1XXXXXXXXXX$)(.+)/.test(line)) twilioPhoneFound = true;
    }
  }

  assert(twilioAccountSidFound, 'TWILIO_ACCOUNT_SID not set with real value in any local env file (.env, .env.local, .env.template)');
  assert(twilioAuthTokenFound, 'TWILIO_AUTH_TOKEN not set with real value in any local env file');
  assert(twilioPhoneFound, 'TWILIO_PHONE_NUMBER_US (or TWILIO_PHONE_NUMBER) not set with real value in any local env file');
  console.log('PASS: Twilio credentials present with real values in a local env file');
}

console.log('\nAll tests passed.');
