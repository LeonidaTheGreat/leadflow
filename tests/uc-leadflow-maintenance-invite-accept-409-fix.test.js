'use strict'

/**
 * QC E2E: PR #1851 — Fix invite-accept 409 for pre-provisioned agents
 *
 * Tests the actual HTTP endpoint on the local dev server (port 3030).
 * Covers: pre-provisioned agent flow (the bug), already-accepted guard, expiry guard,
 * new-agent flow (Flow B), and short-password validation.
 */

const crypto = require('crypto')
const assert = require('assert')
const { Pool } = require('pg')

const BASE_URL = process.env.DASHBOARD_URL || 'http://localhost:3030'
const DB_URL = process.env.LOCAL_PG_URL || 'postgresql://clawdbot@localhost/openclaw'
const pool = new Pool({ connectionString: DB_URL })

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

async function post(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return { status: res.status, body: await res.json() }
}

async function test(name, fn) {
  try {
    await fn()
    console.log(`✅ PASS: ${name}`)
    return true
  } catch (err) {
    console.error(`❌ FAIL: ${name}`)
    console.error(`   ${err.message}`)
    return false
  }
}

async function runTests() {
  let passed = 0
  let failed = 0
  const client = await pool.connect()
  const ts = Date.now()
  const inviteIds = []
  const agentIds = []

  try {
    console.log('\n🔍 QC E2E: PR #1851 — invite-accept 409 fix (HTTP layer)\n')

    // ── Test 1: Pre-provisioned flow no longer returns 409 ───────────────────
    if (await test('Flow A: pre-provisioned invite accepted (was 409, now 200)', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex')
      const email = `qc-pre-${ts}@test.local`
      const agentId = crypto.randomUUID()

      await client.query(
        `INSERT INTO real_estate_agents
           (id, email, first_name, last_name, status, plan_tier, email_verified, password_hash, created_at, updated_at)
         VALUES ($1, $2, 'QC', 'Test', 'invited', 'pilot', true, 'invited', NOW(), NOW())`,
        [agentId, email]
      )
      agentIds.push(agentId)

      const { rows } = await client.query(
        `INSERT INTO pilot_invites
           (email, name, token, token_expires_at, agent_id, status, created_at, updated_at)
         VALUES ($1, $2, $3, NOW() + INTERVAL '7 days', $4, 'pending', NOW(), NOW())
         RETURNING id`,
        [email, 'QC Test', hashToken(rawToken), agentId]
      )
      inviteIds.push(rows[0].id)

      const { status, body } = await post('/api/auth/accept-invite', { token: rawToken, password: 'StrongPass1!' })

      assert.strictEqual(status, 200, `Expected 200, got ${status}: ${JSON.stringify(body)}`)
      assert.strictEqual(body.success, true, 'success must be true')
      assert.ok(body.agentId, 'agentId must be returned')
      assert.strictEqual(body.agentId, agentId, 'agentId must match pre-provisioned agent')

      const { rows: agentRows } = await client.query(
        'SELECT status, password_hash, pilot_started_at, pilot_expires_at FROM real_estate_agents WHERE id = $1',
        [agentId]
      )
      assert.strictEqual(agentRows[0].status, 'onboarding', 'Agent status must be onboarding')
      assert.notStrictEqual(agentRows[0].password_hash, 'invited', 'Placeholder password must be replaced')
      assert.ok(agentRows[0].pilot_started_at, 'pilot_started_at must be set')
      assert.ok(agentRows[0].pilot_expires_at, 'pilot_expires_at must be set')
    })) { passed++ } else { failed++ }

    // ── Test 2: Already-accepted invite still returns 409 ────────────────────
    if (await test('Already-accepted invite still returns 409', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex')
      const email = `qc-done-${ts}@test.local`
      const agentId = crypto.randomUUID()

      await client.query(
        `INSERT INTO real_estate_agents
           (id, email, first_name, last_name, status, email_verified, password_hash, created_at, updated_at)
         VALUES ($1, $2, 'QC', 'Done', 'onboarding', true, 'real-hash', NOW(), NOW())`,
        [agentId, email]
      )
      agentIds.push(agentId)

      const { rows } = await client.query(
        `INSERT INTO pilot_invites
           (email, name, token, token_expires_at, agent_id, status, accepted_at, created_at, updated_at)
         VALUES ($1, $2, $3, NOW() + INTERVAL '7 days', $4, 'accepted', NOW(), NOW(), NOW())
         RETURNING id`,
        [email, 'QC Done', hashToken(rawToken), agentId]
      )
      inviteIds.push(rows[0].id)

      const { status, body } = await post('/api/auth/accept-invite', { token: rawToken, password: 'StrongPass1!' })

      assert.strictEqual(status, 409, `Expected 409, got ${status}: ${JSON.stringify(body)}`)
      assert.strictEqual(body.success, false)
    })) { passed++ } else { failed++ }

    // ── Test 3: Expired invite returns 410, not 409 ──────────────────────────
    if (await test('Expired invite returns 410 (expiry check runs first)', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex')
      const email = `qc-exp-${ts}@test.local`
      const agentId = crypto.randomUUID()

      await client.query(
        `INSERT INTO real_estate_agents
           (id, email, first_name, last_name, status, email_verified, password_hash, created_at, updated_at)
         VALUES ($1, $2, 'QC', 'Exp', 'invited', true, 'invited', NOW(), NOW())`,
        [agentId, email]
      )
      agentIds.push(agentId)

      const { rows } = await client.query(
        `INSERT INTO pilot_invites
           (email, name, token, token_expires_at, agent_id, status, created_at, updated_at)
         VALUES ($1, $2, $3, NOW() - INTERVAL '1 hour', $4, 'pending', NOW(), NOW())
         RETURNING id`,
        [email, 'QC Exp', hashToken(rawToken), agentId]
      )
      inviteIds.push(rows[0].id)

      const { status, body } = await post('/api/auth/accept-invite', { token: rawToken, password: 'StrongPass1!' })

      assert.strictEqual(status, 410, `Expected 410 (Gone), got ${status}: ${JSON.stringify(body)}`)
      assert.strictEqual(body.success, false)
    })) { passed++ } else { failed++ }

    // ── Test 4: Flow B — new agent created when no agent_id on invite ────────
    if (await test('Flow B: new-agent invite accepted and agent record created', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex')
      const email = `qc-new-${ts}@test.local`

      const { rows } = await client.query(
        `INSERT INTO pilot_invites
           (email, name, token, token_expires_at, status, created_at, updated_at)
         VALUES ($1, $2, $3, NOW() + INTERVAL '7 days', 'pending', NOW(), NOW())
         RETURNING id`,
        [email, 'QC New', hashToken(rawToken)]
      )
      inviteIds.push(rows[0].id)

      const { status, body } = await post('/api/auth/accept-invite', { token: rawToken, password: 'StrongPass1!' })

      assert.strictEqual(status, 200, `Expected 200, got ${status}: ${JSON.stringify(body)}`)
      assert.strictEqual(body.success, true)
      assert.ok(body.agentId, 'agentId must be returned for new agent')
      agentIds.push(body.agentId)

      const { rows: agentRows } = await client.query(
        'SELECT status, email FROM real_estate_agents WHERE id = $1', [body.agentId]
      )
      assert.strictEqual(agentRows.length, 1, 'Agent record must exist')
      assert.strictEqual(agentRows[0].status, 'onboarding')
      assert.strictEqual(agentRows[0].email, email)
    })) { passed++ } else { failed++ }

    // ── Test 5: Short password rejected (both flows) ──────────────────────────
    if (await test('Short password (< 8 chars) returns 400', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex')
      const email = `qc-short-${ts}@test.local`
      const agentId = crypto.randomUUID()

      await client.query(
        `INSERT INTO real_estate_agents
           (id, email, first_name, last_name, status, plan_tier, email_verified, password_hash, created_at, updated_at)
         VALUES ($1, $2, 'QC', 'Short', 'invited', 'pilot', true, 'invited', NOW(), NOW())`,
        [agentId, email]
      )
      agentIds.push(agentId)

      const { rows } = await client.query(
        `INSERT INTO pilot_invites
           (email, name, token, token_expires_at, agent_id, status, created_at, updated_at)
         VALUES ($1, $2, $3, NOW() + INTERVAL '7 days', $4, 'pending', NOW(), NOW())
         RETURNING id`,
        [email, 'QC Short', hashToken(rawToken), agentId]
      )
      inviteIds.push(rows[0].id)

      const { status, body } = await post('/api/auth/accept-invite', { token: rawToken, password: 'abc' })

      assert.strictEqual(status, 400, `Expected 400, got ${status}: ${JSON.stringify(body)}`)
      assert.strictEqual(body.success, false)
    })) { passed++ } else { failed++ }

    // ── Test 6: Invalid token returns 404 ────────────────────────────────────
    if (await test('Invalid token returns 404', async () => {
      const { status, body } = await post('/api/auth/accept-invite', {
        token: 'totally-invalid-token-that-does-not-exist',
        password: 'StrongPass1!'
      })
      assert.strictEqual(status, 404, `Expected 404, got ${status}: ${JSON.stringify(body)}`)
      assert.strictEqual(body.success, false)
    })) { passed++ } else { failed++ }

  } finally {
    if (inviteIds.length > 0) {
      await client.query('DELETE FROM pilot_invites WHERE id = ANY($1::uuid[])', [inviteIds])
    }
    if (agentIds.length > 0) {
      await client.query('DELETE FROM pilot_progress WHERE agent_id = ANY($1::uuid[])', [agentIds])
      await client.query('DELETE FROM real_estate_agents WHERE id = ANY($1::uuid[])', [agentIds])
    }
    client.release()
    await pool.end()
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`)
  process.exit(failed > 0 ? 1 : 0)
}

runTests().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
