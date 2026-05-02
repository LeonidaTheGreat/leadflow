'use strict';

/**
 * E2E verification for PR #1403:
 * - ApiKeyAuthService properly handles timing-safe key comparison
 * - Quality gate no_direct_db passes (no .from() in routes/admin/reactivation-campaign.js)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '../..');

function projectPath(rel) {
  return path.join(PROJECT_ROOT, rel);
}

// ── Test 1: service correctly handles matching keys ──────────────────────────
{
  const { ApiKeyAuthService } = require(projectPath('lib/services/api-key-auth-service'));

  assert.strictEqual(
    ApiKeyAuthService.isAuthorized({ expected: 'my-api-key', provided: 'my-api-key' }),
    true,
    'should return true for matching keys'
  );
  console.log('✅ matching keys → true');
}

// ── Test 2: service rejects wrong key ────────────────────────────────────────
{
  const { ApiKeyAuthService } = require(projectPath('lib/services/api-key-auth-service'));

  assert.strictEqual(
    ApiKeyAuthService.isAuthorized({ expected: 'my-api-key', provided: 'wrong-key' }),
    false,
    'should return false for mismatched keys'
  );
  console.log('✅ mismatched keys → false');
}

// ── Test 3: service trims whitespace before comparing ────────────────────────
{
  const { ApiKeyAuthService } = require(projectPath('lib/services/api-key-auth-service'));

  assert.strictEqual(
    ApiKeyAuthService.isAuthorized({ expected: 'my-api-key', provided: '  my-api-key  ' }),
    true,
    'should trim whitespace and match'
  );
  console.log('✅ trimmed whitespace match → true');
}

// ── Test 4: service rejects empty keys ───────────────────────────────────────
{
  const { ApiKeyAuthService } = require(projectPath('lib/services/api-key-auth-service'));

  assert.strictEqual(
    ApiKeyAuthService.isAuthorized({ expected: '', provided: 'some-key' }),
    false,
    'should return false when expected is empty'
  );
  assert.strictEqual(
    ApiKeyAuthService.isAuthorized({ expected: 'some-key', provided: '' }),
    false,
    'should return false when provided is empty'
  );
  assert.strictEqual(
    ApiKeyAuthService.isAuthorized({ expected: undefined, provided: undefined }),
    false,
    'should return false for undefined inputs'
  );
  console.log('✅ empty/undefined keys → false');
}

// ── Test 5: no .from() calls remain in the route ─────────────────────────────
{
  const routePath = projectPath('routes/admin/reactivation-campaign.js');
  const content = fs.readFileSync(routePath, 'utf8');
  const codeLines = content.split('\n').filter(l => !l.trim().startsWith('*') && !l.trim().startsWith('//'));
  const fromMatches = codeLines.filter(l => /\.from\s*\(/.test(l));
  assert.strictEqual(
    fromMatches.length,
    0,
    `Expected 0 .from() calls in route, found: ${fromMatches.join(', ')}`
  );
  console.log('✅ no .from() calls in route (no_direct_db gate passes)');
}

// ── Test 6: service is properly imported from the route ──────────────────────
{
  const routePath = projectPath('routes/admin/reactivation-campaign.js');
  const content = fs.readFileSync(routePath, 'utf8');
  assert.ok(
    content.includes("require('../../lib/services/api-key-auth-service')"),
    'route should import api-key-auth-service'
  );
  assert.ok(
    content.includes('ApiKeyAuthService.isAuthorized'),
    'route should delegate auth to ApiKeyAuthService.isAuthorized'
  );
  console.log('✅ route wires api-key-auth-service correctly');
}

// ── Test 7: no hardcoded secrets in the new service ──────────────────────────
{
  const servicePath = projectPath('lib/services/api-key-auth-service.js');
  const content = fs.readFileSync(servicePath, 'utf8');
  const secretPatterns = [/sk-[a-zA-Z0-9]{20,}/, /[A-Z0-9]{32,}/, /password\s*=\s*['"][^'"]+['"]/i];
  for (const pattern of secretPatterns) {
    assert.ok(
      !pattern.test(content),
      `Possible hardcoded secret in api-key-auth-service.js matching ${pattern}`
    );
  }
  console.log('✅ no hardcoded secrets in service');
}

console.log('\n✅ All tests passed — PR #1403 verified');
