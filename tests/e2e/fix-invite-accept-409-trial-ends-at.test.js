/**
 * E2E test: invite accept 409 fix — trial_ends_at column rename + accepted_at migration
 *
 * Verifies:
 * 1. pilot_invites.accepted_at column exists in live DB (migration 025)
 * 2. real_estate_agents.trial_ends_at column exists in live DB
 * 3. set-password route source uses trial_ends_at (not trial_expires_at)
 * 4. accept-invite route guards on accepted_at (not agent_id) for 409
 * 5. Full DB round-trip: insert invite, simulate set-password update, verify accepted_at + trial_ends_at written
 */

'use strict'

const assert = require('assert')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const PG_URL = process.env.LOCAL_PG_URL || 'postgresql://clawdbot@localhost/openclaw'

async function run() {
  const client = new Client({ connectionString: PG_URL })
  await client.connect()

  let passed = 0
  let failed = 0

  function ok(label, cond, detail = '') {
    if (cond) {
      console.log(`  ✅ ${label}`)
      passed++
    } else {
      console.error(`  ❌ ${label}${detail ? ': ' + detail : ''}`)
      failed++
    }
  }

  try {
    // 1. pilot_invites.accepted_at column exists
    const piCols = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'pilot_invites' AND column_name = 'accepted_at'`
    )
    ok('pilot_invites.accepted_at column exists (migration 025)', piCols.rows.length === 1)

    // 2. real_estate_agents.trial_ends_at column exists
    const rea = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'real_estate_agents' AND column_name = 'trial_ends_at'`
    )
    ok('real_estate_agents.trial_ends_at column exists', rea.rows.length === 1)

    // 3. real_estate_agents does NOT have trial_expires_at
    const expiry = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'real_estate_agents' AND column_name = 'trial_expires_at'`
    )
    ok('real_estate_agents has no trial_expires_at column (stale name absent)', expiry.rows.length === 0)

    // 4. set-password source uses trial_ends_at, not trial_expires_at
    const setPasswordSrc = fs.readFileSync(
      path.join(__dirname, '../../product/lead-response/dashboard/app/api/auth/set-password/route.ts'),
      'utf8'
    )
    ok('set-password route uses trial_ends_at', setPasswordSrc.includes('trial_ends_at'))
    ok('set-password route does NOT use trial_expires_at', !setPasswordSrc.includes('trial_expires_at'))

    // 5. accept-invite source guards on accepted_at, not agent_id
    const acceptSrc = fs.readFileSync(
      path.join(__dirname, '../../product/lead-response/dashboard/app/api/auth/accept-invite/route.ts'),
      'utf8'
    )
    ok('accept-invite guards on accepted_at for 409', acceptSrc.includes('invite.accepted_at'))
    ok('accept-invite does NOT 409 on agent_id presence',
      !acceptSrc.match(/if\s*\(\s*invite\.agent_id\s*\)\s*\{?\s*return\s+NextResponse\.json/))

    // 6. Migration 025 file is safe to re-run (uses IF NOT EXISTS)
    const migSrc = fs.readFileSync(
      path.join(__dirname, '../../migrations/025_add_pilot_invites_accepted_at.sql'),
      'utf8'
    )
    ok('migration 025 uses ADD COLUMN IF NOT EXISTS (idempotent)', migSrc.includes('ADD COLUMN IF NOT EXISTS'))

    // 7. DB round-trip: create test agent + invite, simulate set-password update, verify accepted_at + trial_ends_at
    const testEmail = `qc-test-${Date.now()}@example.test`
    const rawToken = crypto.randomBytes(16).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
    const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    // insert test agent
    const agentResult = await client.query(
      `INSERT INTO real_estate_agents
         (email, first_name, last_name, password_hash, source, status, email_verified, plan_tier, created_at, updated_at)
       VALUES ($1, 'QC', 'Test', 'invited', 'pilot_invite', 'invited', true, 'pilot', NOW(), NOW())
       RETURNING id`,
      [testEmail]
    )
    const agentId = agentResult.rows[0].id

    // insert test invite
    await client.query(
      `INSERT INTO pilot_invites
         (email, name, token, token_expires_at, status, agent_id, created_at, updated_at)
       VALUES ($1, 'QC Test', $2, $3, 'pending', $4, NOW(), NOW())`,
      [testEmail, tokenHash, tokenExpiry, agentId]
    )

    // simulate set-password agent update (what the route does)
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    const passwordHash = 'bcrypt-placeholder-hash'
    const { rowCount: agentUpdated } = await client.query(
      `UPDATE real_estate_agents
       SET password_hash = $1, status = 'onboarding', trial_start_date = NOW(), trial_ends_at = $2, updated_at = NOW()
       WHERE id = $3`,
      [passwordHash, trialEndsAt, agentId]
    )
    ok('agent update with trial_ends_at succeeds', agentUpdated === 1)

    // simulate set-password invite update
    const { rowCount: inviteUpdated } = await client.query(
      `UPDATE pilot_invites
       SET status = 'accepted', accepted_at = NOW()
       WHERE agent_id = $1`,
      [agentId]
    )
    ok('invite update with accepted_at succeeds', inviteUpdated === 1)

    // verify DB state
    const verify = await client.query(
      `SELECT a.trial_ends_at, a.status AS agent_status,
              i.accepted_at, i.status AS invite_status
       FROM real_estate_agents a
       JOIN pilot_invites i ON i.agent_id = a.id
       WHERE a.id = $1`,
      [agentId]
    )
    const row = verify.rows[0]
    ok('agent.trial_ends_at is set in DB', row && row.trial_ends_at !== null)
    ok('agent.status = onboarding', row && row.agent_status === 'onboarding')
    ok('invite.accepted_at is set in DB', row && row.accepted_at !== null)
    ok('invite.status = accepted', row && row.invite_status === 'accepted')

    // cleanup
    await client.query(`DELETE FROM pilot_invites WHERE agent_id = $1`, [agentId])
    await client.query(`DELETE FROM real_estate_agents WHERE id = $1`, [agentId])

  } finally {
    await client.end()
  }

  console.log(`\n${passed + failed} checks — ${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

run().catch(err => {
  console.error('Test error:', err)
  process.exit(1)
})
