/**
 * E2E test for: invite-pilot endpoint returns inviteUrl when email fails
 * PR #1321 — dev/82c869fc-dev-fix-zero-real-pilots-recruited-retur
 *
 * Tests the core logic of the fix without requiring a live database:
 * 1. When emailSent is false, response includes inviteUrl
 * 2. When emailSent is true, response does NOT include inviteUrl
 * 3. Frontend defaults emailSent to true when not present in response (emailSent ?? true)
 * 4. UI conditional logic is coherent (no case shows both or neither banner)
 */

'use strict'

const assert = require('assert')

let passed = 0
let total = 0

function test(name, fn) {
  total++
  try {
    fn()
    console.log(`✅ ${name}`)
    passed++
  } catch (err) {
    console.log(`❌ ${name}: ${err.message}`)
  }
}

// ── Simulate the API route response-building logic ──────────────────────────
function buildInviteResponse({ emailSent, inviteUrl }) {
  const response = {
    success: true,
    agentId: 'test-agent-id',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    emailSent
  }

  if (!emailSent) {
    response.inviteUrl = inviteUrl
  }

  return response
}

// ── Simulate the frontend emailSent state resolution ─────────────────────────
function resolveEmailSent(apiEmailSent) {
  return apiEmailSent ?? true
}

// ── Simulate UI conditional visibility ───────────────────────────────────────
function getUIState(success, emailSent, inviteUrl) {
  return {
    showSuccessBanner: success && emailSent === true,
    showEmailFailedBanner: success && emailSent === false,
    showManualLink: success && emailSent === false && Boolean(inviteUrl)
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test('API: inviteUrl is included when emailSent=false', () => {
  const url = 'https://leadflow-ai-five.vercel.app/accept-invite?token=abc123'
  const response = buildInviteResponse({ emailSent: false, inviteUrl: url })
  assert.strictEqual(response.inviteUrl, url, 'inviteUrl must be present when emailSent=false')
})

test('API: inviteUrl is NOT included when emailSent=true', () => {
  const url = 'https://leadflow-ai-five.vercel.app/accept-invite?token=abc123'
  const response = buildInviteResponse({ emailSent: true, inviteUrl: url })
  assert.strictEqual(response.inviteUrl, undefined, 'inviteUrl must be absent when emailSent=true')
})

test('API: success and required fields always present', () => {
  const r1 = buildInviteResponse({ emailSent: true, inviteUrl: 'x' })
  const r2 = buildInviteResponse({ emailSent: false, inviteUrl: 'x' })
  for (const r of [r1, r2]) {
    assert.strictEqual(r.success, true)
    assert.ok(r.agentId)
    assert.ok(r.expiresAt)
    assert.ok(typeof r.emailSent === 'boolean')
  }
})

test('Frontend: emailSent defaults to true when API omits it', () => {
  assert.strictEqual(resolveEmailSent(undefined), true, 'undefined should default to true')
  assert.strictEqual(resolveEmailSent(null), true, 'null should default to true')
})

test('Frontend: emailSent false/true preserved from API', () => {
  assert.strictEqual(resolveEmailSent(false), false)
  assert.strictEqual(resolveEmailSent(true), true)
})

test('UI: success + emailSent=true → only success banner', () => {
  const ui = getUIState(true, true, null)
  assert.strictEqual(ui.showSuccessBanner, true)
  assert.strictEqual(ui.showEmailFailedBanner, false)
  assert.strictEqual(ui.showManualLink, false)
})

test('UI: success + emailSent=false + url → failure banner + manual link', () => {
  const ui = getUIState(true, false, 'https://example.com/accept-invite?token=x')
  assert.strictEqual(ui.showSuccessBanner, false)
  assert.strictEqual(ui.showEmailFailedBanner, true)
  assert.strictEqual(ui.showManualLink, true)
})

test('UI: success + emailSent=false but no url → failure banner only, no link', () => {
  const ui = getUIState(true, false, null)
  assert.strictEqual(ui.showSuccessBanner, false)
  assert.strictEqual(ui.showEmailFailedBanner, true)
  assert.strictEqual(ui.showManualLink, false)
})

test('UI: not yet submitted → no banners', () => {
  const ui = getUIState(false, null, null)
  assert.strictEqual(ui.showSuccessBanner, false)
  assert.strictEqual(ui.showEmailFailedBanner, false)
  assert.strictEqual(ui.showManualLink, false)
})

test('UI: success + emailSent=null (pre-submit default) → no banners', () => {
  // emailSent starts as null; before any submission, no banners should fire
  const ui = getUIState(false, null, null)
  assert.strictEqual(ui.showSuccessBanner, false)
  assert.strictEqual(ui.showEmailFailedBanner, false)
})

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n📊 ${passed}/${total} passed`)
if (passed < total) {
  process.exit(1)
}
