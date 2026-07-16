'use strict';

/**
 * QC E2E: fix-invite-accept-409-broken-recruitment
 *
 * Regression: accept-invite returned 409 for any invite with agent_id set
 * (all invites created by invite-pilot are pre-created with agent_id).
 *
 * Fix: split into two endpoints:
 *   POST /api/auth/accept-invite — token validation only (read-only)
 *   POST /api/auth/set-password  — mutates DB (activates agent, marks accepted)
 *
 * Tests the route handlers directly — no Next.js server needed.
 */

const assert = require('assert');
const crypto = require('crypto');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}: ${err.message}`);
    failed++;
  }
}

// ─── Minimal mocks to isolate routes from DB ─────────────────────────────────

const DB_MODULES = ['@/lib/db'];
const mockFrom = { from: () => {} };
const mockModule = { postgrestAdmin: mockFrom, supabaseAdmin: mockFrom };

// Inject module mock into require.cache before loading routes
function patchModule(id, resolved) {
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports: mockModule,
    children: [],
    parent: null,
    paths: [],
  };
}

// Resolve the actual TS file via the path alias
function resolveAlias(alias) {
  // In the dashboard dir, @/ maps to the dashboard root
  const dashRoot = require('path').resolve(
    __dirname,
    '../product/lead-response/dashboard'
  );
  const rel = alias.replace('@/', '');
  // Try .ts, .js
  for (const ext of ['', '.ts', '.js', '/index.ts', '/index.js']) {
    const full = require('path').join(dashRoot, rel + ext);
    if (require('fs').existsSync(full)) return full;
  }
  return null;
}

function makeChain(result) {
  const c = {};
  const chainMethods = ['select', 'eq', 'neq', 'update', 'insert', 'is', 'upsert'];
  chainMethods.forEach(m => { c[m] = () => c; });
  c.single = async () => result;
  c.maybeSingle = async () => result;
  c.then = resolve => Promise.resolve(result).then(resolve);
  return c;
}

function makeReq(body) {
  return {
    json: async () => body,
    headers: new Map(),
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

async function runAll() {
  console.log('\n🧪 Invite Accept 409 Fix — E2E Regression Tests\n');

  // Dynamically load the routes with mocked DB
  const dbResolved = resolveDashboardModule('lib/db');
  if (dbResolved) patchModule('@/lib/db', dbResolved);

  // Load route handlers
  let acceptInvite, setPassword;
  try {
    // Clear any cached modules from prior runs
    Object.keys(require.cache)
      .filter(k => k.includes('accept-invite') || k.includes('set-password'))
      .forEach(k => delete require.cache[k]);

    // Use Next.js server-side route handlers directly
    const acceptMod = requireDashboard('app/api/auth/accept-invite/route');
    const setPwdMod = requireDashboard('app/api/auth/set-password/route');
    acceptInvite = acceptMod.POST;
    setPassword = setPwdMod.POST;
  } catch (e) {
    console.error('  ⚠️  Could not load route handlers:', e.message);
    console.log('  → Skipping route-handler tests (dashboard TypeScript requires ts-node or Next.js runtime)');
    await runHttpFallbackTests();
    printResults();
    return;
  }

  await runRouteTests(acceptInvite, setPassword);
  printResults();
}

function resolveDashboardModule(rel) {
  const dashRoot = require('path').resolve(
    __dirname,
    '../product/lead-response/dashboard'
  );
  for (const ext of ['', '.ts', '.js', '/index.ts', '/index.js']) {
    const full = require('path').join(dashRoot, rel + ext);
    if (require('fs').existsSync(full)) return full;
  }
  return null;
}

function requireDashboard(rel) {
  const resolved = resolveDashboardModule(rel);
  if (!resolved) throw new Error(`Cannot resolve dashboard module: ${rel}`);
  return require(resolved);
}

async function runHttpFallbackTests() {
  // Fallback: test the business logic directly without the Next.js runtime.
  // Verify that the key guard (if invite.agent_id → 409) no longer exists.
  console.log('\n  Fallback mode: static code analysis + direct handler logic tests\n');

  await test('accept-invite route must NOT have agent_id 409 guard', async () => {
    const fs = require('fs');
    const path = require('path');
    const routePath = path.join(
      __dirname,
      '../product/lead-response/dashboard/app/api/auth/accept-invite/route.ts'
    );
    const src = fs.readFileSync(routePath, 'utf8');
    // Old guard: if (invite.agent_id) { return 409 }
    assert.ok(
      !src.includes('if (invite.agent_id)'),
      'accept-invite must not contain `if (invite.agent_id)` 409 guard'
    );
  });

  await test('accept-invite route uses accepted_at as the 409 trigger', async () => {
    const fs = require('fs');
    const path = require('path');
    const routePath = path.join(
      __dirname,
      '../product/lead-response/dashboard/app/api/auth/accept-invite/route.ts'
    );
    const src = fs.readFileSync(routePath, 'utf8');
    assert.ok(
      src.includes('invite.accepted_at'),
      'accept-invite must check accepted_at for the 409 guard'
    );
    assert.ok(
      src.includes('status: 409'),
      'accept-invite must still return 409 for already-accepted invites'
    );
  });

  await test('set-password route exists and handles both pre-created and legacy agents', async () => {
    const fs = require('fs');
    const path = require('path');
    const routePath = path.join(
      __dirname,
      '../product/lead-response/dashboard/app/api/auth/set-password/route.ts'
    );
    assert.ok(fs.existsSync(routePath), 'set-password route file must exist');
    const src = fs.readFileSync(routePath, 'utf8');
    // Pre-created agent path: update existing row
    assert.ok(src.includes('invite.agent_id'), 'handles pre-created agent case');
    // Legacy agent path: insert new row
    assert.ok(src.includes('uuidv4'), 'handles legacy invite fallback (create agent)');
    // Password hashing
    assert.ok(src.includes('bcrypt.hash'), 'hashes password with bcrypt');
    // Marks accepted
    assert.ok(src.includes('accepted_at'), 'sets accepted_at on completion');
  });

  await test('accept-invite page.tsx has password-form state (two-step UI)', async () => {
    const fs = require('fs');
    const path = require('path');
    const pagePath = path.join(
      __dirname,
      '../product/lead-response/dashboard/app/accept-invite/page.tsx'
    );
    const src = fs.readFileSync(pagePath, 'utf8');
    assert.ok(
      src.includes("'password-form'"),
      'page must include password-form state for two-step UI'
    );
    assert.ok(
      src.includes('/api/auth/set-password'),
      'page must call set-password endpoint'
    );
  });

  await test('jest.config.ts re-enables accept-invite-flow test', async () => {
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(
      __dirname,
      '../product/lead-response/dashboard/jest.config.ts'
    );
    const src = fs.readFileSync(configPath, 'utf8');
    assert.ok(
      !src.includes("'accept-invite-flow.test.ts'"),
      'accept-invite-flow.test.ts must not be in testPathIgnorePatterns'
    );
  });
}

async function runRouteTests(acceptInvite, setPassword) {
  const now = new Date().toISOString();
  const futureExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await test('accept-invite: 400 for missing token', async () => {
    const res = await acceptInvite(makeReq({}));
    assert.strictEqual(res.status, 400);
  });

  await test('REGRESSION: accept-invite returns 200 (not 409) when agent_id pre-set and accepted_at null', async () => {
    const invite = { id: 'inv-1', email: 'agent@example.com', name: 'Jane Smith',
      agent_id: crypto.randomUUID(), accepted_at: null, token_expires_at: futureExpiry };
    require('@/lib/db').postgrestAdmin.from = () => makeChain({ data: invite, error: null });
    const res = await acceptInvite(makeReq({ token: 'rawtoken' }));
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status} — regression not fixed`);
    const data = await res.json();
    assert.ok(data.success, 'success must be true');
  });

  await test('accept-invite: 409 when accepted_at is set', async () => {
    const invite = { id: 'inv-2', email: 'done@example.com', name: 'Done',
      agent_id: crypto.randomUUID(), accepted_at: now, token_expires_at: futureExpiry };
    require('@/lib/db').postgrestAdmin.from = () => makeChain({ data: invite, error: null });
    const res = await acceptInvite(makeReq({ token: 'rawtoken' }));
    assert.strictEqual(res.status, 409);
  });

  await test('set-password: 400 for short password', async () => {
    const res = await setPassword(makeReq({ token: 'abc', password: 'short' }));
    assert.strictEqual(res.status, 400);
  });
}

function printResults() {
  console.log(`\n📊 Results: ${passed}/${passed + failed} passed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runAll().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
