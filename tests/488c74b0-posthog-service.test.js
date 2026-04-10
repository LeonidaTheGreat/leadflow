'use strict';
/**
 * QC test for task 488c74b0 — PosthogService class refactor
 * Verifies the refactor is complete: old file gone, new class wired correctly,
 * no stale imports, all methods present and callable.
 */

const path = require('path');
const fs   = require('fs');

const ROOT = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;
const results = [];

function pass(msg) { console.log('  PASS:', msg); passed++; results.push({ pass: true, msg }); }
function fail(msg) { console.log('  FAIL:', msg); failed++; results.push({ pass: false, msg }); }

console.log('\n=== QC Test 488c74b0: PosthogService class refactor ===\n');

// ── 1. Old file deleted ───────────────────────────────────────────────────────
console.log('1. Old file removed');
const oldPath = path.join(ROOT, 'lib', 'posthog-server.js');
if (!fs.existsSync(oldPath)) pass('lib/posthog-server.js is deleted');
else                          fail('lib/posthog-server.js still exists — dead code not cleaned up');

// ── 2. New service file exists ────────────────────────────────────────────────
console.log('\n2. New service file');
const newPath = path.join(ROOT, 'lib', 'services', 'PosthogService.js');
if (!fs.existsSync(newPath)) {
  fail('lib/services/PosthogService.js does not exist');
  console.log(`\nFailed: ${failed}, Passed: ${passed}`);
  process.exit(1);
}
pass('lib/services/PosthogService.js exists');

// ── 3. Class structure ────────────────────────────────────────────────────────
console.log('\n3. Class structure');
const src = fs.readFileSync(newPath, 'utf8');

if (/class PosthogService/.test(src))                    pass('PosthogService class defined');
else                                                      fail('PosthogService class missing');

if (/module\.exports\s*=\s*PosthogService/.test(src))    pass('exports class (not singleton)');
else                                                      fail('must export the class, not an instance');

if (/constructor\s*\(/.test(src))                        pass('has constructor');
else                                                      fail('missing constructor');

// Check that constructor accepts options for injection
if (/options\.client/.test(src))                         pass('accepts injected client (options.client)');
else                                                      fail('missing client injection — cannot be tested without real posthog-node');

// ── 4. Method coverage ────────────────────────────────────────────────────────
console.log('\n4. Method coverage');
const requiredMethods = [
  'trackEvent', 'trackConversion', 'trackLeadCapture',
  'trackFormSubmission', 'identifyUser', 'getFeatureFlag', 'shutdown'
];
for (const m of requiredMethods) {
  if (new RegExp(`${m}\\s*\\(`).test(src)) pass(`${m}() present`);
  else                                      fail(`${m}() missing`);
}

// ── 5. Named constants (no magic numbers) ─────────────────────────────────────
console.log('\n5. No magic numbers');
if (/const FLUSH_AT\s*=/.test(src))           pass('FLUSH_AT named constant defined');
else                                           fail('flush count is a bare magic number');
if (/const FLUSH_INTERVAL_MS\s*=/.test(src))  pass('FLUSH_INTERVAL_MS named constant defined');
else                                           fail('flush interval is a bare magic number');

// ── 6. Instantiation with mock client ────────────────────────────────────────
console.log('\n6. Instantiation with mock client');
const PosthogService = require(newPath);
const mockCalls = [];
const mockClient = {
  capture:        (args) => { mockCalls.push({ method: 'capture', args }); },
  identify:       (args) => { mockCalls.push({ method: 'identify', args }); },
  getFeatureFlag: async () => true,
  shutdown:       async () => {},
  debug:          () => {},
};

let svc;
try {
  svc = new PosthogService({ client: mockClient });
  pass('instantiated with injected client');
} catch (err) {
  fail(`constructor threw: ${err.message}`);
  process.exit(1);
}

if (svc.isConfigured !== undefined) pass('isConfigured() method present');

// trackEvent
mockCalls.length = 0;
svc.trackEvent('user-1', 'test_event', { foo: 'bar' });
if (mockCalls.length === 1 && mockCalls[0].method === 'capture')     pass('trackEvent calls client.capture');
else                                                                   fail('trackEvent did not call client.capture');

const capturedEvent = mockCalls[0]?.args;
if (capturedEvent?.distinctId === 'user-1')                           pass('distinctId forwarded correctly');
else                                                                   fail('distinctId not forwarded');
if (capturedEvent?.event === 'test_event')                            pass('event name forwarded');
else                                                                   fail('event name not forwarded');
if (capturedEvent?.properties?.source === 'server')                   pass('source=server injected automatically');
else                                                                   fail('source=server not injected');

// identifyUser
mockCalls.length = 0;
svc.identifyUser('user-2', { email: 'a@b.com' });
if (mockCalls.length === 1 && mockCalls[0].method === 'identify')     pass('identifyUser calls client.identify');
else                                                                   fail('identifyUser did not call client.identify');

// trackConversion delegates to trackEvent
mockCalls.length = 0;
svc.trackConversion('user-3', 'signup', 0);
if (mockCalls.length === 1 && mockCalls[0].args?.event === 'conversion') pass('trackConversion emits conversion event');
else                                                                       fail('trackConversion event name wrong');

// trackLeadCapture
mockCalls.length = 0;
svc.trackLeadCapture('user-4', 'test@example.com');
if (mockCalls.length === 1) {
  const props = mockCalls[0].args?.properties;
  if (props?.conversion_type === 'lead_capture') pass('trackLeadCapture sets conversion_type=lead_capture');
  else                                            fail('trackLeadCapture conversion_type mismatch');
  if (props?.email === 'test@example.com')        pass('trackLeadCapture forwards email');
  else                                            fail('trackLeadCapture email not forwarded');
  if (props?.email_domain === 'example.com')      pass('trackLeadCapture extracts email_domain');
  else                                            fail('trackLeadCapture email_domain not extracted');
} else {
  fail('trackLeadCapture did not produce exactly 1 capture call');
}

// getFeatureFlag
(async () => {
  try {
    const val = await svc.getFeatureFlag('user-5', 'flag-key');
    if (val === true) pass('getFeatureFlag returns resolved value');
    else              fail('getFeatureFlag returned wrong value');
  } catch (err) {
    fail(`getFeatureFlag threw: ${err.message}`);
  }

  // ── 7. No stale imports of posthog-server ──────────────────────────────────
  console.log('\n7. No stale imports');
  function walkJs(dir) {
    if (!fs.existsSync(dir)) return [];
    const stat = fs.statSync(dir);
    if (!stat.isDirectory()) return [dir];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries.flatMap(e => {
      const full = path.join(dir, e.name);
      return e.isDirectory() ? walkJs(full) : (e.name.endsWith('.js') ? [full] : []);
    });
  }

  const scanDirs = ['routes', 'lib', 'server.js', 'app'].map(d => path.join(ROOT, d));
  let staleFound = false;
  for (const dir of scanDirs) {
    for (const file of walkJs(dir)) {
      if (file.includes('PosthogService')) continue;
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('posthog-server')) {
        fail(`stale import in ${path.relative(ROOT, file)}`);
        staleFound = true;
      }
    }
  }
  if (!staleFound) pass('no posthog-server imports in routes/, lib/, server.js, app/');

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50) + '\n');
  process.exit(failed > 0 ? 1 : 0);
})();
