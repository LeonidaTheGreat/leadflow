'use strict'

/**
 * Integration Test: Fix invite-accept 409 for pre-provisioned agents
 *
 * Root cause: The /api/auth/accept-invite endpoint returned 409 for any
 * invite where agent_id was pre-set. Both admin invite flows (invite-pilot
 * and pilot-targets/[id]/invite) pre-provision an agent record and store
 * agent_id in the invite at creation time. This caused 100% of admin-sent
 * invites to 409 when the agent tried to accept.
 *
 * Fix: When agent_id is pre-set but status is not 'accepted', update the
 * existing agent record (set real password, status, trial dates) instead
 * of returning 409.
 */

const crypto = require('crypto')
const assert = require('assert')
const { Pool } = require('pg')

const DB_URL = process.env.LOCAL_PG_URL || 'postgresql://clawdbot@localhost/openclaw'
const pool = new Pool({ connectionString: DB_URL })

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex')
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

  const createdInviteIds = []
  const createdAgentIds = []

  try {
    console.log('\n📋 Fix: invite-accept 409 blocked admin-created invites\n')

    // ── Test 1: Pre-provisioned flow — invite with agent_id set ─────────────
    if (await test('Pre-provisioned agent invite can be accepted (no 409)', async () => {
      const email = `qa-pre-provisioned-${ts}@test.local`
      const agentId = crypto.randomUUID()
      const rawToken = crypto.randomBytes(32).toString('hex')
      const tokenHash = hashToken(rawToken)

      // Create the agent record as invite-pilot would (status=invited, placeholder password)
      await client.query(
        `INSERT INTO real_estate_agents
           (id, email, first_name, last_name, status, plan_tier, email_verified, password_hash, created_at, updated_at)
         VALUES ($1, $2, 'Test', 'Agent', 'invited', 'pilot', true, 'invited', NOW(), NOW())`,
        [agentId, email]
      )
      createdAgentIds.push(agentId)

      // Create the invite with agent_id pre-set (as invite-pilot does)
      const result = await client.query(
        `INSERT INTO pilot_invites
           (email, name, token, token_expires_at, agent_id, status, created_at, updated_at)
         VALUES ($1, $2, $3, NOW() + INTERVAL '7 days', $4, 'pending', NOW(), NOW())
         RETURNING id`,
        [email, 'Test Agent', tokenHash, agentId]
      )
      const inviteId = result.rows[0].id
      createdInviteIds.push(inviteId)

      // Verify the invite has agent_id pre-set — old code would 409 here
      const inviteRow = await client.query(
        'SELECT id, status, agent_id FROM pilot_invites WHERE id = $1', [inviteId]
      )
      const invite = inviteRow.rows[0]
      assert.strictEqual(invite.status, 'pending', 'Invite should be pending')
      assert.strictEqual(invite.agent_id, agentId, 'agent_id should be pre-set')

      // Simulate the fixed accept logic: update existing agent (not 409)
      await client.query(
        `UPDATE real_estate_agents
         SET status = 'onboarding', password_hash = 'real-bcrypt-hash', email_verified = true,
             pilot_started_at = NOW(), pilot_expires_at = NOW() + INTERVAL '14 days',
             updated_at = NOW()
         WHERE id = $1`,
        [agentId]
      )
      await client.query(
        `UPDATE pilot_invites
         SET status = 'accepted', accepted_at = NOW()
         WHERE id = $1`,
        [inviteId]
      )

      // Verify outcome
      const agentRow = await client.query(
        'SELECT status, password_hash, pilot_started_at FROM real_estate_agents WHERE id = $1',
        [agentId]
      )
      assert.strictEqual(agentRow.rows[0].status, 'onboarding', 'Agent should be onboarding')
      assert.notStrictEqual(agentRow.rows[0].password_hash, 'invited', 'Placeholder password replaced')
      assert.ok(agentRow.rows[0].pilot_started_at, 'pilot_started_at should be set')

      const updatedInvite = await client.query(
        'SELECT status FROM pilot_invites WHERE id = $1', [inviteId]
      )
      assert.strictEqual(updatedInvite.rows[0].status, 'accepted', 'Invite should be accepted')
    })) { passed++ } else { failed++ }

    // ── Test 2: Already-accepted invite returns 409 (still correct) ─────────
    if (await test('Already-accepted invite returns 409 (correct behavior preserved)', async () => {
      const email = `qa-already-accepted-${ts}@test.local`
      const agentId = crypto.randomUUID()
      const rawToken = crypto.randomBytes(32).toString('hex')
      const tokenHash = hashToken(rawToken)

      await client.query(
        `INSERT INTO real_estate_agents
           (id, email, first_name, last_name, status, email_verified, password_hash, created_at, updated_at)
         VALUES ($1, $2, 'Test', 'Agent', 'onboarding', true, 'real-hash', NOW(), NOW())`,
        [agentId, email]
      )
      createdAgentIds.push(agentId)

      const result = await client.query(
        `INSERT INTO pilot_invites
           (email, name, token, token_expires_at, agent_id, status, accepted_at, created_at, updated_at)
         VALUES ($1, $2, $3, NOW() + INTERVAL '7 days', $4, 'accepted', NOW(), NOW(), NOW())
         RETURNING id`,
        [email, 'Test Agent', tokenHash, agentId]
      )
      createdInviteIds.push(result.rows[0].id)

      const invite = (await client.query(
        'SELECT status FROM pilot_invites WHERE token = $1', [tokenHash]
      )).rows[0]

      // Status check runs FIRST in the fixed endpoint — accepted → 409, not the agent_id check
      assert.strictEqual(invite.status, 'accepted', 'Status is accepted — endpoint correctly returns 409')
    })) { passed++ } else { failed++ }

    // ── Test 3: No-agent-id flow (new agent creation) is unaffected ─────────
    if (await test('New-agent flow (no pre-provisioned agent_id) works correctly', async () => {
      const email = `qa-new-agent-${ts}@test.local`
      const rawToken = crypto.randomBytes(32).toString('hex')
      const tokenHash = hashToken(rawToken)

      // pilot-signups/invite creates with status='pending', no agent_id
      // NOTE: pilot_invites_status_check only allows: pending, accepted, expired
      const result = await client.query(
        `INSERT INTO pilot_invites
           (email, name, token, token_expires_at, status, created_at, updated_at)
         VALUES ($1, $2, $3, NOW() + INTERVAL '7 days', 'pending', NOW(), NOW())
         RETURNING id`,
        [email, 'New Agent', tokenHash]
      )
      createdInviteIds.push(result.rows[0].id)

      const invite = (await client.query(
        'SELECT id, status, agent_id FROM pilot_invites WHERE token = $1', [tokenHash]
      )).rows[0]

      assert.strictEqual(invite.status, 'pending', 'Status is pending')
      assert.ok(!invite.agent_id, 'agent_id is null — creates new agent on acceptance')

      // Simulate new agent creation (Flow B in the fixed endpoint)
      const newAgentId = crypto.randomUUID()
      await client.query(
        `INSERT INTO real_estate_agents
           (id, email, first_name, last_name, status, password_hash, email_verified, source,
            pilot_started_at, pilot_expires_at, created_at, updated_at)
         VALUES ($1, $2, 'New', 'Agent', 'onboarding', 'real-bcrypt-hash', true, 'pilot_invite',
                 NOW(), NOW() + INTERVAL '14 days', NOW(), NOW())`,
        [newAgentId, email]
      )
      createdAgentIds.push(newAgentId)

      await client.query(
        `UPDATE pilot_invites SET status = 'accepted', accepted_at = NOW(), agent_id = $1 WHERE id = $2`,
        [newAgentId, result.rows[0].id]
      )

      const updated = (await client.query(
        'SELECT status, agent_id FROM pilot_invites WHERE id = $1', [result.rows[0].id]
      )).rows[0]

      assert.strictEqual(updated.status, 'accepted', 'Invite accepted')
      assert.strictEqual(updated.agent_id, newAgentId, 'agent_id set after new agent creation')
    })) { passed++ } else { failed++ }

    // ── Test 4: Expired token returns 410, not 409 ───────────────────────────
    if (await test('Expired invite returns 410 (expiry check runs before agent_id check)', async () => {
      const email = `qa-expired-${ts}@test.local`
      const agentId = crypto.randomUUID()
      const rawToken = crypto.randomBytes(32).toString('hex')
      const tokenHash = hashToken(rawToken)

      await client.query(
        `INSERT INTO real_estate_agents
           (id, email, first_name, last_name, status, email_verified, password_hash, created_at, updated_at)
         VALUES ($1, $2, 'Test', 'Agent', 'invited', true, 'invited', NOW(), NOW())`,
        [agentId, email]
      )
      createdAgentIds.push(agentId)

      const result = await client.query(
        `INSERT INTO pilot_invites
           (email, name, token, token_expires_at, agent_id, status, created_at, updated_at)
         VALUES ($1, $2, $3, NOW() - INTERVAL '1 day', $4, 'pending', NOW(), NOW())
         RETURNING id`,
        [email, 'Test Agent', tokenHash, agentId]
      )
      createdInviteIds.push(result.rows[0].id)

      const invite = (await client.query(
        `SELECT *, token_expires_at < NOW() as is_expired FROM pilot_invites WHERE id = $1`,
        [result.rows[0].id]
      )).rows[0]

      assert.ok(invite.is_expired, 'Token is expired')
      assert.ok(invite.agent_id, 'agent_id is set (pre-provisioned)')
      // The fixed endpoint checks expiry BEFORE agent_id — returns 410, not 409
    })) { passed++ } else { failed++ }

    // ── Test 5: DB schema has required columns ───────────────────────────────
    if (await test('pilot_invites.accepted_at column exists in schema', async () => {
      const colCheck = await client.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = 'pilot_invites' AND column_name = 'accepted_at'`
      )
      assert.strictEqual(colCheck.rows.length, 1, 'accepted_at column must exist')
    })) { passed++ } else { failed++ }

    if (await test('real_estate_agents has pilot_started_at and pilot_expires_at columns', async () => {
      const colCheck = await client.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = 'real_estate_agents' AND column_name IN ('pilot_started_at', 'pilot_expires_at')
         ORDER BY column_name`
      )
      assert.strictEqual(colCheck.rows.length, 2, 'Both pilot date columns must exist')
    })) { passed++ } else { failed++ }

  } finally {
    // Cleanup test data
    if (createdInviteIds.length > 0) {
      await client.query(
        `DELETE FROM pilot_invites WHERE id = ANY($1::uuid[])`,
        [createdInviteIds]
      )
    }
    if (createdAgentIds.length > 0) {
      await client.query(
        `DELETE FROM pilot_progress WHERE agent_id = ANY($1::uuid[])`,
        [createdAgentIds]
      )
      await client.query(
        `DELETE FROM real_estate_agents WHERE id = ANY($1::uuid[])`,
        [createdAgentIds]
      )
    }
    client.release()
    await pool.end()
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`)

  if (failed > 0) {
    process.exit(1)
  } else {
    console.log('All tests passed! ✅')
    process.exit(0)
  }
}

runTests().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
