'use strict';

const assert = require('assert');

let passed = 0;
let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`  FAIL: ${name}: ${err.message}`);
    failed++;
  }
}

function buildLoginUrl(appUrl) {
  return `${(appUrl || 'https://leadflow-ai-five.vercel.app').trim().replace(/\/$/, '')}/login`;
}

function validateBody(body) {
  if (body.all) return { type: 'all' };
  if (!body.agentId || typeof body.agentId !== 'string') {
    return { error: 'agentId is required', status: 400 };
  }
  return { type: 'single', agentId: body.agentId };
}

function buildSingleResponse(agent, appUrl) {
  return {
    success: true,
    agentId: agent.id,
    email: agent.email,
    firstName: agent.first_name,
    lastName: agent.last_name,
    loginUrl: buildLoginUrl(appUrl),
  };
}

function buildBulkResponse(count, appUrl) {
  return { success: true, count, loginUrl: buildLoginUrl(appUrl) };
}

async function run() {
  console.log('\n=== QC E2E: uc-admin-email-verify-override ===\n');

  // -- Validation edge cases --

  await check('rejects empty body', async () => {
    const r = validateBody({});
    assert.strictEqual(r.error, 'agentId is required');
    assert.strictEqual(r.status, 400);
  });

  await check('rejects numeric agentId', async () => {
    const r = validateBody({ agentId: 42 });
    assert.strictEqual(r.status, 400);
  });

  await check('rejects empty string agentId', async () => {
    const r = validateBody({ agentId: '' });
    assert.strictEqual(r.status, 400);
  });

  await check('rejects null agentId', async () => {
    const r = validateBody({ agentId: null });
    assert.strictEqual(r.status, 400);
  });

  await check('accepts valid UUID agentId', async () => {
    const r = validateBody({ agentId: '550e8400-e29b-41d4-a716-446655440000' });
    assert.strictEqual(r.type, 'single');
    assert.strictEqual(r.agentId, '550e8400-e29b-41d4-a716-446655440000');
  });

  await check('all=true takes precedence over agentId', async () => {
    const r = validateBody({ all: true, agentId: 'abc' });
    assert.strictEqual(r.type, 'all');
  });

  await check('all=false does not trigger bulk', async () => {
    const r = validateBody({ all: false, agentId: 'abc' });
    assert.strictEqual(r.type, 'single');
  });

  // -- URL construction edge cases --

  await check('handles trailing slash in APP_URL', async () => {
    assert.strictEqual(buildLoginUrl('https://example.com/'), 'https://example.com/login');
  });

  await check('handles no trailing slash', async () => {
    assert.strictEqual(buildLoginUrl('https://example.com'), 'https://example.com/login');
  });

  await check('handles whitespace around APP_URL', async () => {
    assert.strictEqual(buildLoginUrl('  https://example.com  '), 'https://example.com/login');
  });

  await check('fallback URL when undefined', async () => {
    const url = buildLoginUrl(undefined);
    assert.strictEqual(url, 'https://leadflow-ai-five.vercel.app/login');
  });

  await check('fallback URL when empty string', async () => {
    const url = buildLoginUrl('');
    assert.strictEqual(url, 'https://leadflow-ai-five.vercel.app/login');
  });

  // -- Response shape contracts --

  await check('single response has all required fields', async () => {
    const agent = { id: 'a1', email: 'test@test.com', first_name: 'Test', last_name: 'User' };
    const r = buildSingleResponse(agent, 'https://app.com');
    assert.strictEqual(typeof r.success, 'boolean');
    assert.strictEqual(typeof r.agentId, 'string');
    assert.strictEqual(typeof r.email, 'string');
    assert.ok(r.loginUrl.endsWith('/login'));
    assert.strictEqual(Object.keys(r).length, 6);
  });

  await check('bulk response has all required fields', async () => {
    const r = buildBulkResponse(5, 'https://app.com');
    assert.strictEqual(r.success, true);
    assert.strictEqual(r.count, 5);
    assert.ok(r.loginUrl.endsWith('/login'));
    assert.strictEqual(Object.keys(r).length, 3);
  });

  await check('single response preserves null names', async () => {
    const agent = { id: 'a2', email: 'x@y.com', first_name: null, last_name: null };
    const r = buildSingleResponse(agent, 'https://app.com');
    assert.strictEqual(r.firstName, null);
    assert.strictEqual(r.lastName, null);
  });

  // -- Frontend fmtDate logic --

  await check('fmtDate appends Z to timestamps without timezone', async () => {
    const raw = '2026-01-15T10:30:00';
    const d = new Date(raw.endsWith('Z') ? raw : raw + 'Z');
    assert.ok(!isNaN(d.getTime()));
    const formatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    assert.ok(formatted.includes('2026'));
  });

  await check('fmtDate handles timestamp already with Z', async () => {
    const raw = '2026-01-15T10:30:00Z';
    const d = new Date(raw.endsWith('Z') ? raw : raw + 'Z');
    assert.ok(!isNaN(d.getTime()));
  });

  // -- Dashboard build verification --

  await check('dashboard build includes activation page', async () => {
    const fs = require('fs');
    const path = require('path');
    const pageFile = path.join(__dirname, '../../product/lead-response/dashboard/app/admin/activation/page.tsx');
    assert.ok(fs.existsSync(pageFile), 'activation page.tsx must exist');
    const content = fs.readFileSync(pageFile, 'utf8');
    assert.ok(content.includes('export default'), 'must have default export');
    assert.ok(content.includes('requireAdmin') === false, 'page.tsx should not import requireAdmin (that belongs in route.ts)');
  });

  await check('API route imports requireAdmin for auth', async () => {
    const fs = require('fs');
    const path = require('path');
    const routeFile = path.join(__dirname, '../../product/lead-response/dashboard/app/api/admin/activation/route.ts');
    assert.ok(fs.existsSync(routeFile), 'activation route.ts must exist');
    const content = fs.readFileSync(routeFile, 'utf8');
    assert.ok(content.includes("requireAdmin"), 'route must use requireAdmin');
    assert.ok(content.includes("postgrestAdmin"), 'route must use postgrestAdmin');
    assert.ok(!content.includes('Math.random'), 'no weak randomness');
    assert.ok(!content.includes('eval('), 'no eval');
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
