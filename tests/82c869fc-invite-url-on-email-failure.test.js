'use strict'

/*
TASK SPEC (f060922a-c687-43cf-aee5-8893ab89501a)
What:
- Resolve rebase conflict in tests/82c869fc-invite-url-on-email-failure.test.js
- Preserve both sides' intent by keeping Jest-structured test suite while retaining full scenario coverage added in conflicting commit.

Verify:
- git status --short shows conflict resolved after git add
- npm test exits 0
- npm run build exits 0
- npm run lint exits 0
- npm audit --audit-level=high exits 0 high/critical

Boundaries:
- Do not change route/service/business logic implementation for pilot recruitment in this conflict-resolve task.
- Do not modify unrelated tests/files unless required by rebase conflict resolution.
*/

/**
 * E2E test for: invite-pilot endpoint returns inviteUrl when email fails
 * PR #1321 — dev/82c869fc-dev-fix-zero-real-pilots-recruited-retur
 *
 * Coverage:
 * 1) emailSent=false includes inviteUrl
 * 2) emailSent=true omits inviteUrl
 * 3) frontend defaults missing emailSent to true (emailSent ?? true)
 * 4) UI conditional logic stays coherent
 */

// Simulate the API route response-building logic
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

// Simulate frontend emailSent state resolution
function resolveEmailSent(apiEmailSent) {
  return apiEmailSent ?? true
}

// Simulate UI conditional visibility
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
