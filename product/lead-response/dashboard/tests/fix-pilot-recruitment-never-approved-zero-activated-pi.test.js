const assert = require('assert')
const fs = require('fs')
const path = require('path')

const inviteRoutePath = path.join(
  __dirname,
  '..',
  'app',
  'api',
  'admin',
  'pilot-targets',
  '[id]',
  'invite',
  'route.ts'
)

const campaignsPagePath = path.join(
  __dirname,
  '..',
  'app',
  'admin',
  'pilot-campaigns',
  'page.tsx'
)

const pilotsPagePath = path.join(
  __dirname,
  '..',
  'app',
  'admin',
  'pilots',
  'page.tsx'
)

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

function test(name, fn) {
  try {
    fn()
    console.log(`PASS ${name}`)
  } catch (error) {
    console.error(`FAIL ${name}`)
    console.error(error.stack || error.message)
    process.exitCode = 1
  }
}

const { execSync } = require('child_process')

const inviteRoute = read(inviteRoutePath)
const campaignsPage = read(campaignsPagePath)
const pilotsPage = read(pilotsPagePath)

test('invite endpoint exists and enforces admin session auth', () => {
  assert(inviteRoute.includes("requireAdminSession"))
  assert(inviteRoute.includes("@/lib/admin-auth"))
  assert(inviteRoute.includes("Unauthorized"))
})

test('invite endpoint creates or reuses a pilot agent and persists pilot invite records', () => {
  assert(inviteRoute.includes("from('real_estate_agents')"))
  assert(inviteRoute.includes("plan_tier: 'pilot'"))
  assert(inviteRoute.includes("status: 'invited'"))
  assert(inviteRoute.includes("from('pilot_invites')"))
  assert(inviteRoute.includes("status: 'pending'"))
  assert(inviteRoute.includes("token_expires_at"))
})

test('invite endpoint hashes tokens and returns a usable accept-invite URL', () => {
  assert(inviteRoute.includes("crypto.createHash('sha256').update(rawToken).digest('hex')"))
  assert(inviteRoute.includes('accept-invite?token=${rawToken}'))
  assert(inviteRoute.includes('sendPilotInviteEmail'))
  assert(inviteRoute.includes("status: 'contacted'"))
})

test('campaign UI exposes a Send Invite action for reachable recruitment targets', () => {
  assert(campaignsPage.includes("/api/admin/pilot-targets/${targetId}/invite"))
  // Cookie auth: admin_session httpOnly cookie travels automatically with fetch.
  // No admin token in request headers; 401 redirects to /admin/login.
  assert(campaignsPage.includes("/admin/login"))
  assert(campaignsPage.includes('Send Invite'))
  assert(campaignsPage.includes('copyInviteUrl'))
})

test('pilots admin UI distinguishes real pilots from test accounts and links back to recruiting', () => {
  assert(pilotsPage.includes('No real pilots recruited yet'))
  assert(pilotsPage.includes('/admin/pilot-campaigns'))
  assert(pilotsPage.includes('Hide test accounts'))
  assert(pilotsPage.includes('Show ${testPilots.length} test account'))
  assert(pilotsPage.includes('real pilot'))
})

test('pilot_invites.token column is text type (accepts SHA-256 hex tokens)', () => {
  const result = execSync(
    `psql postgresql://clawdbot@localhost/openclaw -tAc "SELECT data_type FROM information_schema.columns WHERE table_name='pilot_invites' AND column_name='token';"`,
    { encoding: 'utf8' }
  ).trim()
  assert.strictEqual(result, 'text', `pilot_invites.token must be text (got ${result}) — migration 019 required`)
})

if (process.exitCode) {
  process.exit(process.exitCode)
}
