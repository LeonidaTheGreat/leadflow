/**
 * E2E Test: PosthogService class refactor
 * Task: 96e4559d-1e8e-4b22-b4a1-50f2b2a5d3cc
 *
 * Verifies:
 * 1. Old file lib/posthog-server.js is deleted
 * 2. New file lib/services/PosthogService.js exists and exports a class
 * 3. Class instantiates and exposes all required methods
 * 4. No remaining imports of posthog-server in routes/, lib/, server.js
 */

'use strict';

const path = require('path');
const fs   = require('fs');

const ROOT = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;

function pass(msg) { console.log('  PASS:', msg); passed++; }
function fail(msg) { console.log('  FAIL:', msg); failed++; }

function fileExists(p) { return fs.existsSync(p); }
function read(p)        { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }

console.log('\n=== Task 96e4559d: PosthogService class refactor ===\n');

// ── 1. Old file removed ───────────────────────────────────────────────────────
console.log('1. Old file removed');
const oldPath = path.join(ROOT, 'lib', 'posthog-server.js');
if (!fileExists(oldPath)) pass('lib/posthog-server.js deleted');
else                       fail('lib/posthog-server.js still exists — must be deleted');

// ── 2. New service exists ─────────────────────────────────────────────────────
console.log('\n2. New service exists');
const newPath = path.join(ROOT, 'lib', 'services', 'PosthogService.js');
if (!fileExists(newPath)) {
  fail('lib/services/PosthogService.js does not exist');
} else {
  pass('lib/services/PosthogService.js exists');

  const src = read(newPath);

  if (/class PosthogService/.test(src)) pass('exports PosthogService class');
  else                                   fail('PosthogService class definition not found');

  if (/module\.exports\s*=\s*PosthogService/.test(src)) pass('module.exports = PosthogService');
  else                                                    fail('must export PosthogService class (not singleton)');

  for (const method of ['trackEvent', 'trackConversion', 'trackLeadCapture', 'trackFormSubmission', 'identifyUser', 'getFeatureFlag', 'shutdown']) {
    if (new RegExp(`${method}\\s*\\(`).test(src)) pass(`PosthogService.${method} present`);
    else                                            fail(`PosthogService.${method} missing`);
  }

  // ── 3. Instantiation test ─────────────────────────────────────────────────
  console.log('\n3. Instantiation');
  try {
    const mockClient = {
      capture: () => {},
      identify: () => {},
      getFeatureFlag: async () => true,
      shutdown: async () => {},
      debug: () => {},
    };
    const PosthogService = require(newPath);
    const svc = new PosthogService({ client: mockClient });
    if (typeof svc.trackEvent === 'function')       pass('trackEvent callable');
    if (typeof svc.trackConversion === 'function')  pass('trackConversion callable');
    if (typeof svc.identifyUser === 'function')     pass('identifyUser callable');
    if (typeof svc.getFeatureFlag === 'function')   pass('getFeatureFlag callable');
    if (typeof svc.shutdown === 'function')         pass('shutdown callable');
  } catch (err) {
    fail(`Instantiation threw: ${err.message}`);
  }
}

// ── 4. No remaining imports of posthog-server ─────────────────────────────────
console.log('\n4. No remaining posthog-server imports');
const searchDirs = ['routes', 'lib', 'server.js'];
let found = false;
for (const target of searchDirs) {
  const fullPath = path.join(ROOT, target);
  if (!fs.existsSync(fullPath)) continue;

  const files = fs.statSync(fullPath).isDirectory()
    ? walkJs(fullPath)
    : [fullPath];

  for (const file of files) {
    const content = read(file);
    if (content.includes('posthog-server')) {
      fail(`${path.relative(ROOT, file)} still imports posthog-server`);
      found = true;
    }
  }
}
if (!found) pass('No posthog-server imports remain in routes/, lib/, server.js');

function walkJs(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walkJs(full));
    else if (entry.name.endsWith('.js')) result.push(full);
  }
  return result;
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50) + '\n');

process.exit(failed > 0 ? 1 : 0);
