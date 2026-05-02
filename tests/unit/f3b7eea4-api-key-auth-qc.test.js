'use strict';

/**
 * QC verification for PR #1403 (task f3b7eea4):
 * Fix quality gate "no_direct_db" by delegating Buffer.from() auth logic
 * into ApiKeyAuthService, removing it from the route.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '../..');

const { ApiKeyAuthService } = require(path.join(ROOT, 'lib/services/api-key-auth-service'));

// ── 1. Matching keys ─────────────────────────────────────────────────────────
assert.strictEqual(
  ApiKeyAuthService.isAuthorized({ expected: 'abc123', provided: 'abc123' }),
  true,
  'matching keys must return true'
);
console.log('✅ 1. matching keys → true');

// ── 2. Mismatched keys ───────────────────────────────────────────────────────
assert.strictEqual(
  ApiKeyAuthService.isAuthorized({ expected: 'abc123', provided: 'wrong' }),
  false,
  'mismatched keys must return false'
);
console.log('✅ 2. mismatched keys → false');

// ── 3. Timing-safe — different-length keys must not throw ───────────────────
assert.doesNotThrow(() => {
  ApiKeyAuthService.isAuthorized({ expected: 'short', provided: 'a-very-long-key-that-is-different' });
}, 'different-length keys must not throw (length check before timingSafeEqual)');
assert.strictEqual(
  ApiKeyAuthService.isAuthorized({ expected: 'short', provided: 'a-very-long-key-that-is-different' }),
  false,
  'different-length keys must return false'
);
console.log('✅ 3. different-length keys → false (no throw)');

// ── 4. Whitespace trimming ───────────────────────────────────────────────────
assert.strictEqual(
  ApiKeyAuthService.isAuthorized({ expected: '  key  ', provided: 'key' }),
  true,
  'whitespace in expected must be trimmed before compare'
);
assert.strictEqual(
  ApiKeyAuthService.isAuthorized({ expected: 'key', provided: '  key  ' }),
  true,
  'whitespace in provided must be trimmed before compare'
);
console.log('✅ 4. whitespace trimmed → true');

// ── 5. Empty / null / undefined guards ──────────────────────────────────────
assert.strictEqual(ApiKeyAuthService.isAuthorized({ expected: '', provided: 'key' }), false);
assert.strictEqual(ApiKeyAuthService.isAuthorized({ expected: 'key', provided: '' }), false);
assert.strictEqual(ApiKeyAuthService.isAuthorized({ expected: null, provided: 'key' }), false);
assert.strictEqual(ApiKeyAuthService.isAuthorized({ expected: 'key', provided: undefined }), false);
assert.strictEqual(ApiKeyAuthService.isAuthorized({ expected: undefined, provided: undefined }), false);
console.log('✅ 5. empty/null/undefined → false');

// ── 6. Route no longer contains Buffer.from() calls ─────────────────────────
const routeSource = fs.readFileSync(
  path.join(ROOT, 'routes/admin/reactivation-campaign.js'),
  'utf8'
);
const codeLines = routeSource.split('\n').filter(l => !l.trim().startsWith('*') && !l.trim().startsWith('//'));
const fromCalls = codeLines.filter(l => /Buffer\.from\s*\(/.test(l));
assert.strictEqual(
  fromCalls.length,
  0,
  `Route must not contain Buffer.from() calls; found: ${fromCalls.join(', ')}`
);
console.log('✅ 6. no Buffer.from() in route → no_direct_db gate passes');

// ── 7. Route imports ApiKeyAuthService ──────────────────────────────────────
assert.ok(
  routeSource.includes("require('../../lib/services/api-key-auth-service')"),
  'route must import api-key-auth-service'
);
assert.ok(
  routeSource.includes('ApiKeyAuthService.isAuthorized'),
  'route must delegate to ApiKeyAuthService.isAuthorized'
);
console.log('✅ 7. route wires ApiKeyAuthService correctly');

// ── 8. Service file has no hardcoded secrets ─────────────────────────────────
const serviceSource = fs.readFileSync(
  path.join(ROOT, 'lib/services/api-key-auth-service.js'),
  'utf8'
);
const secretPatterns = [/sk-[a-zA-Z0-9]{20,}/, /password\s*=\s*['"][^'"]+['"]/i];
for (const pat of secretPatterns) {
  assert.ok(!pat.test(serviceSource), `Possible hardcoded secret in service matching ${pat}`);
}
console.log('✅ 8. no hardcoded secrets in service');

console.log('\n✅ All 8 QC checks passed — PR #1403 verified');
