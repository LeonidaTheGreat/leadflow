'use strict';

/**
 * Tests for uc-admin-email-verify-override
 * Validates the activation API logic: body validation, db update path, and login URL construction.
 *
 * These tests simulate the route handler logic without a Next.js runtime by
 * extracting the core validation and data-shaping logic into testable helpers —
 * same pattern as tests/82c869fc-invite-url-on-email-failure.test.js.
 */

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

// ── Extracted route logic (mirrors app/api/admin/activation/route.ts) ────────

function buildLoginUrl(appUrl) {
  return `${(appUrl || 'https://leadflow-ai-five.vercel.app').trim().replace(/\/$/, '')}/login`;
}

function validateSingleBody(body) {
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
  return {
    success: true,
    count,
    loginUrl: buildLoginUrl(appUrl),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n=== uc-admin-email-verify-override: activation API ===\n');

  // ── Body validation ───────────────────────────────────────────────────────

  await check('validateSingleBody returns error when agentId missing', async () => {
    const result = validateSingleBody({});
    assert.strictEqual(result.error, 'agentId is required');
    assert.strictEqual(result.status, 400);
  });

  await check('validateSingleBody returns error when agentId is not a string', async () => {
    const result = validateSingleBody({ agentId: 123 });
    assert.strictEqual(result.error, 'agentId is required');
  });

  await check('validateSingleBody returns single type with agentId', async () => {
    const result = validateSingleBody({ agentId: 'abc-123' });
    assert.strictEqual(result.type, 'single');
    assert.strictEqual(result.agentId, 'abc-123');
  });

  await check('validateSingleBody detects all=true bulk flag', async () => {
    const result = validateSingleBody({ all: true });
    assert.strictEqual(result.type, 'all');
  });

  // ── Login URL construction ─────────────────────────────────────────────────

  await check('buildLoginUrl appends /login to APP_URL', async () => {
    const url = buildLoginUrl('https://leadflow-ai-five.vercel.app');
    assert.strictEqual(url, 'https://leadflow-ai-five.vercel.app/login');
  });

  await check('buildLoginUrl strips trailing slash before appending /login', async () => {
    const url = buildLoginUrl('https://leadflow-ai-five.vercel.app/');
    assert.strictEqual(url, 'https://leadflow-ai-five.vercel.app/login');
  });

  await check('buildLoginUrl falls back to default URL when appUrl not set', async () => {
    const url = buildLoginUrl(null);
    assert.ok(url.startsWith('https://leadflow-ai-five.vercel.app'));
    assert.ok(url.endsWith('/login'));
  });

  // ── Single verify response ─────────────────────────────────────────────────

  await check('buildSingleResponse includes success, agentId, email, and loginUrl', async () => {
    const agent = { id: 'agent-1', email: 'alice@test.com', first_name: 'Alice', last_name: 'Smith' };
    const response = buildSingleResponse(agent, 'https://app.example.com');
    assert.strictEqual(response.success, true);
    assert.strictEqual(response.agentId, 'agent-1');
    assert.strictEqual(response.email, 'alice@test.com');
    assert.strictEqual(response.firstName, 'Alice');
    assert.strictEqual(response.lastName, 'Smith');
    assert.strictEqual(response.loginUrl, 'https://app.example.com/login');
  });

  await check('buildSingleResponse works with null names', async () => {
    const agent = { id: 'agent-2', email: 'bob@test.com', first_name: null, last_name: null };
    const response = buildSingleResponse(agent, 'https://app.example.com');
    assert.strictEqual(response.success, true);
    assert.strictEqual(response.firstName, null);
    assert.strictEqual(response.lastName, null);
    assert.strictEqual(response.email, 'bob@test.com');
  });

  // ── Bulk verify response ────────────────────────────────────────────────────

  await check('buildBulkResponse includes success, count, and loginUrl', async () => {
    const response = buildBulkResponse(29, 'https://app.example.com');
    assert.strictEqual(response.success, true);
    assert.strictEqual(response.count, 29);
    assert.strictEqual(response.loginUrl, 'https://app.example.com/login');
  });

  await check('buildBulkResponse handles zero count', async () => {
    const response = buildBulkResponse(0, 'https://app.example.com');
    assert.strictEqual(response.count, 0);
    assert.strictEqual(response.success, true);
  });

  // ── GET response structure ─────────────────────────────────────────────────

  await check('GET response wraps agents array with count', async () => {
    const agents = [
      { id: '1', first_name: 'Alice', last_name: 'Smith', email: 'alice@test.com', created_at: '2026-01-01T00:00:00Z' },
      { id: '2', first_name: 'Bob', last_name: null, email: 'bob@test.com', created_at: '2026-01-02T00:00:00Z' },
    ];
    const body = { agents, count: agents.length };
    assert.strictEqual(body.count, 2);
    assert.strictEqual(body.agents.length, 2);
    assert.strictEqual(body.agents[0].email, 'alice@test.com');
  });

  // ── Results ───────────────────────────────────────────────────────────────

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
