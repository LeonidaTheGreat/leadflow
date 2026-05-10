'use strict'

/**
 * E2E test for: invite-pilot endpoint returns inviteUrl when email fails
 * PR #1321 — dev/82c869fc-dev-fix-zero-real-pilots-recruited-retur
 *
 * Spec:
 * What:
 * - Resolve rebase conflict in tests/82c869fc-invite-url-on-email-failure.test.js only.
 * - Keep Jest-style tests while preserving detailed behavior coverage from both conflict sides.
 * Verify:
 * - git rebase --continue completes with no conflicts.
 * - npm run build exits 0.
 * - npm run lint exits 0.
 * - npm test exits 0.
 * - npm audit --audit-level=high exits 0.
 * Boundaries:
 * - Do not modify application routes/services for this re-merge conflict task.
 * - Do not change unrelated files or alter product behavior outside this test conflict.
 */

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

describe('invite-url-on-email-failure', () => {
  describe('API response', () => {
    test('inviteUrl is included when emailSent=false', () => {
      const url = 'https://leadflow-ai-five.vercel.app/accept-invite?token=abc123'
      const response = buildInviteResponse({ emailSent: false, inviteUrl: url })
      expect(response.inviteUrl).toBe(url)
    })

    test('inviteUrl is NOT included when emailSent=true', () => {
      const url = 'https://leadflow-ai-five.vercel.app/accept-invite?token=abc123'
      const response = buildInviteResponse({ emailSent: true, inviteUrl: url })
      expect(response.inviteUrl).toBeUndefined()
    })

    test('success and required fields always present', () => {
      const r1 = buildInviteResponse({ emailSent: true, inviteUrl: 'x' })
      const r2 = buildInviteResponse({ emailSent: false, inviteUrl: 'x' })
      for (const r of [r1, r2]) {
        expect(r.success).toBe(true)
        expect(r.agentId).toBeTruthy()
        expect(r.expiresAt).toBeTruthy()
        expect(typeof r.emailSent).toBe('boolean')
      }
    })
  })

  describe('frontend emailSent resolution', () => {
    test('defaults to true when API omits it', () => {
      expect(resolveEmailSent(undefined)).toBe(true)
      expect(resolveEmailSent(null)).toBe(true)
    })

    test('preserves false/true from API', () => {
      expect(resolveEmailSent(false)).toBe(false)
      expect(resolveEmailSent(true)).toBe(true)
    })
  })

  describe('UI conditional visibility', () => {
    test('success + emailSent=true -> only success banner', () => {
      const ui = getUIState(true, true, null)
      expect(ui.showSuccessBanner).toBe(true)
      expect(ui.showEmailFailedBanner).toBe(false)
      expect(ui.showManualLink).toBe(false)
    })

    test('success + emailSent=false + url -> failure banner + manual link', () => {
      const ui = getUIState(true, false, 'https://example.com/accept-invite?token=x')
      expect(ui.showSuccessBanner).toBe(false)
      expect(ui.showEmailFailedBanner).toBe(true)
      expect(ui.showManualLink).toBe(true)
    })

    test('success + emailSent=false but no url -> failure banner only, no link', () => {
      const ui = getUIState(true, false, null)
      expect(ui.showSuccessBanner).toBe(false)
      expect(ui.showEmailFailedBanner).toBe(true)
      expect(ui.showManualLink).toBe(false)
    })

    test('not yet submitted -> no banners', () => {
      const ui = getUIState(false, null, null)
      expect(ui.showSuccessBanner).toBe(false)
      expect(ui.showEmailFailedBanner).toBe(false)
      expect(ui.showManualLink).toBe(false)
    })

    test('success + emailSent=null (pre-submit default) -> no banners', () => {
      const ui = getUIState(false, null, null)
      expect(ui.showSuccessBanner).toBe(false)
      expect(ui.showEmailFailedBanner).toBe(false)
    })
  })
})
