/**
 * QC E2E Test — PR #1108 TwilioService refactor
 * Task: 5570900d-f000-4fce-be7b-96604c1e3b8c
 *
 * Verifies:
 * 1. Old lib/twilio-sms.js is gone (file deleted)
 * 2. New lib/services/TwilioService.js exists with expected methods
 * 3. FUBService (primary consumer) imports TwilioService, not twilio-sms
 * 4. dashboard test that still imports twilio-sms.js is broken (stale ref)
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`PASS ${msg}`);
    passed++;
  } else {
    console.error(`FAIL ${msg}`);
    failed++;
  }
}

// 1. Old file must not exist
assert(!fs.existsSync(path.join(ROOT, 'lib/twilio-sms.js')),
  'lib/twilio-sms.js is deleted (no stale file)');

// 2. New service file must exist
const svcPath = path.join(ROOT, 'lib/services/TwilioService.js');
assert(fs.existsSync(svcPath), 'lib/services/TwilioService.js exists');

// 3. New service is a class with expected methods
let TwilioService;
try {
  TwilioService = require(svcPath);
  assert(typeof TwilioService === 'function', 'TwilioService is a constructor/class');

  const inst = new TwilioService({ db: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }) } });
  assert(typeof inst.sendSms === 'function',            'TwilioService#sendSms exists');
  assert(typeof inst.resolveTwilioContext === 'function','TwilioService#resolveTwilioContext exists');
  assert(typeof inst.validateSmsInput === 'function',   'TwilioService#validateSmsInput exists');
  assert(typeof inst.truncateMessage === 'function',    'TwilioService#truncateMessage exists');
} catch (e) {
  assert(false, `TwilioService requires without error: ${e.message}`);
}

// 4. FUBService imports TwilioService, not twilio-sms
const fubPath = path.join(ROOT, 'lib/services/FUBService.js');
const fubContent = fs.readFileSync(fubPath, 'utf8');
assert(!fubContent.includes("require('../twilio-sms')"),
  "FUBService does NOT import old twilio-sms");
assert(fubContent.includes("require('./TwilioService')"),
  "FUBService imports TwilioService");

// 5. No stale twilio-sms require in production code (routes/, lib/, server.js)
const dirsToCheck = ['routes', 'lib', 'server.js'];
let staleFound = false;
for (const entry of dirsToCheck) {
  const full = path.join(ROOT, entry);
  if (!fs.existsSync(full)) continue;
  const stat = fs.statSync(full);
  if (stat.isFile()) {
    if (fs.readFileSync(full, 'utf8').includes("require('./twilio-sms')") ||
        fs.readFileSync(full, 'utf8').includes("require('../twilio-sms')")) {
      staleFound = true;
    }
    continue;
  }
  // directory — walk .js files
  function walk(dir) {
    for (const f of fs.readdirSync(dir)) {
      const fp = path.join(dir, f);
      const s  = fs.statSync(fp);
      if (s.isDirectory() && f !== 'node_modules' && f !== '.claude') {
        walk(fp);
      } else if (f.endsWith('.js')) {
        const content = fs.readFileSync(fp, 'utf8');
        if (content.includes("require('../twilio-sms')") ||
            content.includes("require('./twilio-sms')") ||
            content.includes('require("../twilio-sms")') ||
            content.includes('require("./twilio-sms")')) {
          staleFound = true;
        }
      }
    }
  }
  walk(full);
}
assert(!staleFound, 'No stale require twilio-sms in routes/, lib/, server.js');

// 6. Stale reference in product/lead-response/dashboard/tests (known issue)
const dashTest = path.join(ROOT,
  'product/lead-response/dashboard/tests/fix-a2p-10dlc-sms-delivery-risk.test.js');
if (fs.existsSync(dashTest)) {
  const content = fs.readFileSync(dashTest, 'utf8');
  const hasStale = content.includes('lib/twilio-sms.js');
  // This test still references deleted file — marks as known stale reference
  assert(!hasStale,
    'dashboard/tests/fix-a2p-10dlc-sms-delivery-risk.test.js: no stale twilio-sms.js require');
} else {
  assert(true, 'dashboard/tests/fix-a2p-10dlc-sms-delivery-risk.test.js: not present (OK)');
}

console.log('\n==================================================');
console.log('QC E2E — TwilioService Refactor (PR #1108)');
console.log('==================================================');
console.log(`Passed: ${passed}  Failed: ${failed}  Total: ${passed + failed}`);
console.log(`Pass rate: ${Math.round(100 * passed / (passed + failed))}%`);

if (failed > 0) process.exit(1);
