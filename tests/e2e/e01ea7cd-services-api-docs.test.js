#!/usr/bin/env node
/**
 * E2E test: SERVICES.md and API.md generation scripts
 *
 * Verifies:
 * 1. Both scripts run without error
 * 2. Generated SERVICES.md has expected structure (header, service count, method tables)
 * 3. Generated API.md has expected structure (header, endpoint count, method columns)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_DIR = path.join(__dirname, '..', '..');

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`);
    failed++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

console.log('\n🧪 E2E: SERVICES.md and API.md generation\n');

// Step 1: Run both scripts
check('generate-services-docs.js runs without error', () => {
  execSync(`node ${path.join(PROJECT_DIR, 'scripts', 'generate-services-docs.js')}`, { stdio: 'pipe' });
});

check('generate-api-docs.js runs without error', () => {
  execSync(`node ${path.join(PROJECT_DIR, 'scripts', 'generate-api-docs.js')}`, { stdio: 'pipe' });
});

// Step 2: SERVICES.md structure checks
const servicesPath = path.join(PROJECT_DIR, 'SERVICES.md');
let services = '';
check('SERVICES.md exists after generation', () => {
  assert(fs.existsSync(servicesPath), 'SERVICES.md not found');
  services = fs.readFileSync(servicesPath, 'utf8');
});

check('SERVICES.md has auto-generated header', () => {
  assert(services.includes('AUTO-GENERATED'), 'Missing AUTO-GENERATED header comment');
});

check('SERVICES.md has Services Reference title', () => {
  assert(services.includes('# Services Reference'), 'Missing Services Reference heading');
});

check('SERVICES.md contains service count summary', () => {
  assert(/\d+ services? across \d+ files?/.test(services), 'Missing service count summary line');
});

check('SERVICES.md has a Methods table (pipe-delimited)', () => {
  assert(services.includes('| Method | Params |'), 'Missing Methods table header');
});

check('SERVICES.md lists at least 5 known services', () => {
  const known = ['BillingService', 'TwilioService', 'FUBService', 'EmailService', 'SequenceService'];
  for (const svc of known) {
    assert(services.includes(svc), `Missing expected service: ${svc}`);
  }
});

// Step 3: API.md structure checks
const apiPath = path.join(PROJECT_DIR, 'API.md');
let api = '';
check('API.md exists after generation', () => {
  assert(fs.existsSync(apiPath), 'API.md not found');
  api = fs.readFileSync(apiPath, 'utf8');
});

check('API.md has auto-generated header', () => {
  assert(api.includes('AUTO-GENERATED'), 'Missing AUTO-GENERATED header comment');
});

check('API.md has API Reference title', () => {
  assert(api.includes('# API Reference'), 'Missing API Reference heading');
});

check('API.md has endpoint count summary', () => {
  assert(/\d+ endpoints? across \d+ files?/.test(api), 'Missing endpoint count summary');
});

check('API.md summary table has Method/Path/Services/Auth columns', () => {
  assert(api.includes('| Method | Path | Services | Auth |'), 'Missing summary table header with Auth column');
});

check('API.md references at least one billing route', () => {
  assert(api.includes('billingService'), 'Expected billingService reference in API.md');
});

check('API.md references the FUB webhook endpoint', () => {
  assert(api.includes('/webhook/fub'), 'Expected /webhook/fub endpoint in API.md');
});

// Summary
console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
