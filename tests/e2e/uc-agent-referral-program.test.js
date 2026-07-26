/**
 * E2E Test: Agent Referral Program
 * UC: uc-leadflow-agent-referral-program
 *
 * Tests DB schema, route files, component wiring, and apply-credit endpoint structure.
 */

'use strict'
const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const DASHBOARD_BASE = path.resolve(__dirname, '../../product/lead-response/dashboard')
const DB_URL = process.env.LOCAL_PG_URL || 'postgresql://clawdbot@localhost/openclaw'

let client

async function connect() {
  client = new Client({ connectionString: DB_URL })
  await client.connect()
}

async function disconnect() {
  if (client) await client.end()
}

describe('Agent Referral Program', () => {
  before(connect)
  after(disconnect)

  // ── DB Schema ──────────────────────────────────────────────────────────────

  it('referral_links table has required columns', async () => {
    const res = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'referral_links'`
    )
    const cols = res.rows.map(r => r.column_name)
    const required = ['id', 'agent_id', 'referral_code', 'referral_link', 'created_at']
    for (const col of required) {
      assert.ok(cols.includes(col), `referral_links missing column: ${col}`)
    }
  })

  it('referrals table has required columns', async () => {
    const res = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'referrals'`
    )
    const cols = res.rows.map(r => r.column_name)
    const required = ['id', 'referrer_agent_id', 'referral_code', 'conversion_status', 'free_months_earned', 'credit_applied']
    for (const col of required) {
      assert.ok(cols.includes(col), `referrals missing column: ${col}`)
    }
  })

  it('real_estate_agents has referral tracking columns', async () => {
    const res = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'real_estate_agents'
         AND column_name IN ('referred_by_agent_id', 'referral_link_generated_at', 'total_referral_credits')`
    )
    const cols = res.rows.map(r => r.column_name)
    assert.strictEqual(cols.length, 3, `Missing referral columns. Found: ${cols.join(', ')}`)
  })

  // ── Route Files ───────────────────────────────────────────────────────────

  it('/api/referrals/generate route file exists', () => {
    const p = path.join(DASHBOARD_BASE, 'app/api/referrals/generate/route.ts')
    assert.ok(fs.existsSync(p), 'generate route missing')
  })

  it('/api/referrals/stats route file exists', () => {
    const p = path.join(DASHBOARD_BASE, 'app/api/referrals/stats/route.ts')
    assert.ok(fs.existsSync(p), 'stats route missing')
  })

  it('/api/referrals/apply-credit route file exists', () => {
    const p = path.join(DASHBOARD_BASE, 'app/api/referrals/apply-credit/route.ts')
    assert.ok(fs.existsSync(p), 'apply-credit route missing')
  })

  it('/r/[code] invite landing page exists', () => {
    const dir = path.join(DASHBOARD_BASE, 'app/r')
    assert.ok(fs.existsSync(dir), '/r/[code] directory missing')
    const pagePath = path.join(dir, '[code]/page.tsx')
    assert.ok(fs.existsSync(pagePath), '/r/[code]/page.tsx missing')
  })

  // ── Component Wiring ──────────────────────────────────────────────────────

  it('ReferralWidget component exists', () => {
    const p = path.join(DASHBOARD_BASE, 'components/ReferralWidget.tsx')
    assert.ok(fs.existsSync(p), 'ReferralWidget.tsx missing')
  })

  it('ReferralWidget is imported in settings page', () => {
    const p = path.join(DASHBOARD_BASE, 'app/settings/page.tsx')
    const content = fs.readFileSync(p, 'utf8')
    assert.ok(content.includes('ReferralWidget'), 'ReferralWidget not referenced in settings page')
  })

  // ── Security ─────────────────────────────────────────────────────────────

  it('generate route uses crypto.randomBytes, not Math.random', () => {
    const content = fs.readFileSync(
      path.join(DASHBOARD_BASE, 'app/api/referrals/generate/route.ts'),
      'utf8'
    )
    assert.ok(content.includes('crypto.randomBytes'), 'Missing crypto.randomBytes')
    assert.ok(!content.includes('Math.random'), 'Uses insecure Math.random')
  })

  it('generate route checks auth and requires paid plan', () => {
    const content = fs.readFileSync(
      path.join(DASHBOARD_BASE, 'app/api/referrals/generate/route.ts'),
      'utf8'
    )
    assert.ok(content.includes('getAuthUserId'), 'Missing auth check')
    assert.ok(content.includes('subscription_status'), 'Missing paid-plan gate')
    assert.ok(content.includes('403'), 'Missing 403 for non-paid agents')
  })

  it('apply-credit route requires authorization header', () => {
    const content = fs.readFileSync(
      path.join(DASHBOARD_BASE, 'app/api/referrals/apply-credit/route.ts'),
      'utf8'
    )
    assert.ok(content.includes('authorization'), 'apply-credit route must check authorization header')
    assert.ok(content.includes('401'), 'apply-credit route must return 401 for unauthorized')
  })

  // ── Email Notification ────────────────────────────────────────────────────

  it('referral email notification module exists', () => {
    const p = path.join(DASHBOARD_BASE, 'lib/referral-email.ts')
    assert.ok(fs.existsSync(p), 'lib/referral-email.ts missing')
    const content = fs.readFileSync(p, 'utf8')
    assert.ok(
      content.includes('sendReferralConversionEmail') || content.includes('sendEmail'),
      'referral-email.ts must export a send function'
    )
  })

  it('apply-credit route imports email notification', () => {
    const content = fs.readFileSync(
      path.join(DASHBOARD_BASE, 'app/api/referrals/apply-credit/route.ts'),
      'utf8'
    )
    assert.ok(
      content.includes('referral-email') || content.includes('sendEmail'),
      'apply-credit must call email notification on conversion'
    )
  })

  // ── Referral Landing Page ─────────────────────────────────────────────────

  it('/r/[code] page stores referral code in browser', () => {
    const content = fs.readFileSync(
      path.join(DASHBOARD_BASE, 'app/r/[code]/page.tsx'),
      'utf8'
    )
    assert.ok(content.includes('referral_code'), 'Landing page must store referral_code')
    assert.ok(
      content.includes('document.cookie') || content.includes('sessionStorage'),
      'Landing page must persist referral code in browser storage'
    )
  })
})
