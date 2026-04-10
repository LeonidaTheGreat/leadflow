/**
 * E2E Test: PosthogService class refactor
 * Task: 488c74b0-9b14-4d4c-8b36-10863a3a158f
 *
 * Verifies:
 * 1. Old file lib/posthog-server.js is deleted
 * 2. New file lib/services/PosthogService.js exists and exports a class
 * 3. Class instantiates with injected mock client (no posthog-node needed)
 * 4. All required methods are present and callable
 * 5. No remaining imports of posthog-server in routes/, lib/, server.js, integrations/
 * 6. trackEvent calls client.capture with expected fields
 * 7. identifyUser calls client.identify
 * 8. shutdown calls client.shutdown
 */

'use strict';

const path = require('path');
const fs = require('fs');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '../..');

let passed = 0;
let failed = 0;

function pass(msg) { console.log('  PASS:', msg); passed++; }
function fail(msg) { console.log('  FAIL:', msg); failed++; process.exitCode = 1; }

function fileExists(p) { return fs.existsSync(p); }

console.log('\n=== Task 488c74b0: PosthogService class refactor (QC) ===\n');

// ── 1. Old file removed ───────────────────────────────────────────────────────
console.log('1. Old file removed');
const oldPath = path.join(ROOT, 'lib', 'posthog-server.js');
if (!fileExists(oldPath)) pass('lib/posthog-server.js deleted');
else fail('lib/posthog-server.js still exists — must be deleted');

// ── 2. New service file exists ────────────────────────────────────────────────
console.log('\n2. New service file exists');
const newPath = path.join(ROOT, 'lib', 'services', 'PosthogService.js');
if (!fileExists(newPath)) {
  fail('lib/services/PosthogService.js does not exist');
  console.log('\nCannot continue without service file.');
  process.exit(1);
}
pass('lib/services/PosthogService.js exists');

// ── 3. Class structure ────────────────────────────────────────────────────────
console.log('\n3. Class structure');
const src = fs.readFileSync(newPath, 'utf8');
if (/class PosthogService/.test(src)) pass('PosthogService class defined');
else fail('PosthogService class not found in file');

if (/module\.exports\s*=\s*PosthogService/.test(src)) pass('module.exports = PosthogService (class, not singleton)');
else fail('must export PosthogService class, not singleton');

const requiredMethods = ['trackEvent', 'trackConversion', 'trackLeadCapture', 'trackFormSubmission', 'identifyUser', 'getFeatureFlag', 'shutdown', 'isConfigured'];
for (const method of requiredMethods) {
  const regex = new RegExp(`${method}\\s*\\(`);
  if (regex.test(src)) pass(`${method}() method present`);
  else fail(`${method}() method missing`);
}

// ── 4. Instantiation with mock client ────────────────────────────────────────
console.log('\n4. Instantiation with injected mock client');
let PosthogService;
try {
  PosthogService = require(newPath);
  pass('require() succeeds');
} catch (e) {
  fail(`require() threw: ${e.message}`);
  process.exit(1);
}

const capturedEvents = [];
const identifiedUsers = [];
let shutdownCalled = false;

const mockClient = {
  capture: (evt) => capturedEvents.push(evt),
  identify: (data) => identifiedUsers.push(data),
  isFeatureEnabled: async (flag, id) => false,
  shutdown: async () => { shutdownCalled = true; },
  debug: () => {},
};

let svc;
try {
  svc = new PosthogService({ apiKey: 'test-key', client: mockClient });
  pass('new PosthogService({ client: mockClient }) succeeds');
} catch (e) {
  fail(`constructor threw: ${e.message}`);
  process.exit(1);
}

// ── 5. Behavioral tests ───────────────────────────────────────────────────────
console.log('\n5. Behavioral tests');

// trackEvent
svc.trackEvent('user-123', 'test_event', { foo: 'bar' });
if (capturedEvents.length === 1 && capturedEvents[0].event === 'test_event' && capturedEvents[0].distinctId === 'user-123') {
  pass('trackEvent calls client.capture with correct distinctId and event');
} else {
  fail(`trackEvent did not call client.capture correctly. Got: ${JSON.stringify(capturedEvents)}`);
}
if (capturedEvents[0] && capturedEvents[0].properties && capturedEvents[0].properties.timestamp) {
  pass('trackEvent adds timestamp to properties');
} else {
  fail('trackEvent does not add timestamp to properties');
}

// identifyUser
svc.identifyUser('user-456', { email: 'test@example.com' });
if (identifiedUsers.length === 1 && identifiedUsers[0].distinctId === 'user-456') {
  pass('identifyUser calls client.identify with correct distinctId');
} else {
  fail(`identifyUser did not call client.identify correctly. Got: ${JSON.stringify(identifiedUsers)}`);
}

// isConfigured
const configured = svc.isConfigured();
assert.strictEqual(typeof configured, 'boolean', 'isConfigured returns boolean');
pass('isConfigured() returns boolean');

// shutdown
(async () => {
  try {
    await svc.shutdown();
    if (shutdownCalled) pass('shutdown() calls client.shutdown()');
    else fail('shutdown() did not call client.shutdown()');
  } catch (e) {
    fail(`shutdown() threw: ${e.message}`);
  }

  // ── 6. No stale imports ───────────────────────────────────────────────────
  console.log('\n6. No stale posthog-server imports');
  const searchDirs = ['routes', 'lib', 'integrations', 'app'];
  let staleFound = false;
  for (const dir of searchDirs) {
    const dirPath = path.join(ROOT, dir);
    if (!fileExists(dirPath)) continue;
    const results = findInDir(dirPath, /require\s*\(\s*['"].*posthog-server['"]/);
    for (const result of results) {
      fail(`Stale import in ${result}`);
      staleFound = true;
    }
  }
  // Also check server.js
  if (fileExists(path.join(ROOT, 'server.js'))) {
    const serverSrc = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
    if (/posthog-server/.test(serverSrc)) {
      fail('Stale posthog-server import in server.js');
      staleFound = true;
    }
  }
  if (!staleFound) pass('No stale posthog-server imports in routes/, lib/, integrations/, app/, server.js');

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50) + '\n');
  if (failed > 0) process.exit(1);
})();

function findInDir(dir, pattern) {
  const matches = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
        matches.push(...findInDir(full, pattern));
      } else if (entry.isFile() && /\.(js|ts)$/.test(entry.name)) {
        const content = fs.readFileSync(full, 'utf8');
        if (pattern.test(content)) matches.push(full);
      }
    }
  } catch {}
  return matches;
}
