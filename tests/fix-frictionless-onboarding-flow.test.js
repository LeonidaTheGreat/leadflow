/**
 * Tests for PRD-FRICTIONLESS-ONBOARDING-001: Self-Serve Frictionless Onboarding Flow
 * Task ID: 1bad8a65-77b0-418e-b59e-759dbe23f358
 */

const path = require('path')
const fs = require('fs')

// ─── Helper: read file contents ────────────────────────────────────────────────
function readFile(relPath) {
  return fs.readFileSync(
    path.join('/Users/clawdbot/projects/leadflow', relPath),
    'utf8'
  )
}

describe('PRD-FRICTIONLESS-ONBOARDING-001: Self-Serve Frictionless Onboarding Flow', () => {

  // ── FR-2 & FR-3: Account Creation + Immediate Access ──────────────────────
  describe('FR-2/FR-3: Trial signup — no email gate, immediate dashboard redirect', () => {
    let routeContent

    beforeAll(() => {
      routeContent = readFile(
        'product/lead-response/dashboard/app/api/auth/trial-signup/route.ts'
      )
    })

    test('Does NOT require email_verified before issuing JWT', () => {
      // The route should NOT gate login on email_verified === true
      expect(routeContent).not.toMatch(/email_verified.*true.*login/i)
      expect(routeContent).not.toMatch(/Require email verification before login/)
    })

    test('Sets an auth cookie on successful signup', () => {
      expect(routeContent).toContain('httpOnly: true')
      // Must set a session cookie (name varies by implementation)
      expect(routeContent).toMatch(/cookies\.set/)
    })

    test('Redirects to /dashboard (not /check-your-inbox)', () => {
      expect(routeContent).toContain("redirectTo: '/dashboard'")
      expect(routeContent).not.toContain("redirectTo: '/check-your-inbox'")
    })

    test('Returns user object with planTier and trialEndsAt', () => {
      expect(routeContent).toContain('planTier:')
      expect(routeContent).toContain('trialEndsAt')
    })
  })

  // ── FR-2: Trial duration is 14 days ────────────────────────────────────────
  describe('FR-2: Trial duration is 14 days', () => {
    test('trial-signup route uses 14-day trial duration', () => {
      const routeContent = readFile(
        'product/lead-response/dashboard/app/api/auth/trial-signup/route.ts'
      )
      expect(routeContent).toContain('14 * 24 * 60 * 60 * 1000')
      expect(routeContent).not.toContain('30 * 24 * 60 * 60 * 1000')
    })

    test('trial_start_at is persisted on agent creation', () => {
      const routeContent = readFile(
        'product/lead-response/dashboard/app/api/auth/trial-signup/route.ts'
      )
      expect(routeContent).toContain('trial_start_at')
    })

    test('UI copy says 14 days (not 30)', () => {
      const formContent = readFile(
        'product/lead-response/dashboard/components/trial-signup-form.tsx'
      )
      expect(formContent).not.toMatch(/30 days/i)
      expect(formContent).toMatch(/14.days/i)
    })
  })

  // ── FR-4: Sample lead data ─────────────────────────────────────────────────
  describe('FR-4: First-session sample lead data', () => {
    test('sample-leads API endpoint exists', () => {
      const routeContent = readFile(
        'product/lead-response/dashboard/app/api/sample-leads/route.ts'
      )
      expect(routeContent).toBeDefined()
    })

    test('sample-leads returns at least 3 leads', () => {
      const routeContent = readFile(
        'product/lead-response/dashboard/app/api/sample-leads/route.ts'
      )
      const sampleLeadMatches = routeContent.match(/id: 'sample-lead-/g) || []
      expect(sampleLeadMatches.length).toBeGreaterThanOrEqual(3)
    })

    test('sample leads are marked with is_sample: true', () => {
      const routeContent = readFile(
        'product/lead-response/dashboard/app/api/sample-leads/route.ts'
      )
      expect(routeContent).toContain('is_sample: true')
    })

    test('sample-leads are only eligible when onboarding_completed is false', () => {
      const routeContent = readFile(
        'product/lead-response/dashboard/app/api/sample-leads/route.ts'
      )
      expect(routeContent).toContain('onboarding_completed')
      expect(routeContent).toContain('eligible = !agent.onboarding_completed')
    })

    test('LeadFeed component integrates sample-leads endpoint', () => {
      const feedContent = readFile(
        'product/lead-response/dashboard/components/dashboard/LeadFeed.tsx'
      )
      expect(feedContent).toContain('/api/sample-leads')
      expect(feedContent).toContain('is_sample')
    })
  })

  // ── FR-5: Guided setup wizard ──────────────────────────────────────────────
  describe('FR-5: Guided Setup Wizard auto-launches', () => {
    test('Dashboard page imports OnboardingWizardOverlay', () => {
      const pageContent = readFile(
        'product/lead-response/dashboard/app/dashboard/page.tsx'
      )
      expect(pageContent).toContain('OnboardingWizardOverlay')
    })

    test('Dashboard page shows wizard when onboarding_completed is false', () => {
      const pageContent = readFile(
        'product/lead-response/dashboard/app/dashboard/page.tsx'
      )
      expect(pageContent).toContain('showWizard')
      expect(pageContent).toContain('onboardingCompleted')
    })

    test('OnboardingWizardOverlay includes FUB, SMS, and simulator steps', () => {
      const overlayContent = readFile(
        'product/lead-response/dashboard/components/onboarding-wizard-overlay.tsx'
      )
      expect(overlayContent).toContain("'fub'")
      expect(overlayContent).toContain("'twilio'")
      expect(overlayContent).toContain("'simulator'")
    })
  })

  // ── FR-7: Trial state visibility ───────────────────────────────────────────
  describe('FR-7: Trial badge visible in dashboard nav', () => {
    test('dashboard-nav imports TrialBadge', () => {
      const navContent = readFile(
        'product/lead-response/dashboard/app/dashboard/dashboard-nav.tsx'
      )
      expect(navContent).toContain('TrialBadge')
    })

    test('TrialBadge shows days remaining for trial tier', () => {
      const badgeContent = readFile(
        'product/lead-response/dashboard/components/dashboard/trial-badge.tsx'
      )
      expect(badgeContent).toContain("planTier !== 'trial'")
      expect(badgeContent).toContain('daysRemaining')
      expect(badgeContent).toContain('remaining')
    })

    test('TrialBadge shows urgent styling when <=7 days remain', () => {
      const badgeContent = readFile(
        'product/lead-response/dashboard/components/dashboard/trial-badge.tsx'
      )
      expect(badgeContent).toContain('isUrgent')
      expect(badgeContent).toContain('<= 7')
    })
  })

  // ── FR-8: Event tracking ───────────────────────────────────────────────────
  describe('FR-8: Onboarding funnel event tracking', () => {
    test('events/track API endpoint exists', () => {
      const routeContent = readFile(
        'product/lead-response/dashboard/app/api/events/track/route.ts'
      )
      expect(routeContent).toBeDefined()
    })

    test('events/track validates against allowlist of funnel events', () => {
      const routeContent = readFile(
        'product/lead-response/dashboard/app/api/events/track/route.ts'
      )
      const requiredEvents = [
        'trial_cta_clicked',
        'trial_signup_started',
        'trial_signup_completed',
        'dashboard_first_paint',
        'sample_data_rendered',
        'wizard_started',
        'wizard_step_completed',
        'aha_simulation_started',
        'aha_simulation_completed',
        'onboarding_completed',
      ]
      requiredEvents.forEach((evt) => {
        expect(routeContent).toContain(`'${evt}'`)
      })
    })

    test('trial-signup route tracks trial_signup_completed event', () => {
      const routeContent = readFile(
        'product/lead-response/dashboard/app/api/auth/trial-signup/route.ts'
      )
      expect(routeContent).toContain('trial_signup_completed')
    })

    test('TrialSignupForm fires trial_signup_started before API call', () => {
      const formContent = readFile(
        'product/lead-response/dashboard/components/trial-signup-form.tsx'
      )
      expect(formContent).toContain('trial_signup_started')
      expect(formContent).toContain('/api/events/track')
    })

    test('LeadFeed fires sample_data_rendered when sample leads are shown', () => {
      const feedContent = readFile(
        'product/lead-response/dashboard/components/dashboard/LeadFeed.tsx'
      )
      expect(feedContent).toContain('sample_data_rendered')
      expect(feedContent).toContain('/api/events/track')
    })

    test('events/track does not fail the UI on errors (returns 200)', () => {
      const routeContent = readFile(
        'product/lead-response/dashboard/app/api/events/track/route.ts'
      )
      // Error handler returns 200, not 5xx
      expect(routeContent).toContain('status: 200')
    })
  })

  // ── Security: no email gate bypass via cookie ──────────────────────────────
  describe('Security: auth token is secure', () => {
    test('auth cookie is httpOnly', () => {
      const routeContent = readFile(
        'product/lead-response/dashboard/app/api/auth/trial-signup/route.ts'
      )
      expect(routeContent).toContain('httpOnly: true')
    })

    test('auth cookie uses sameSite setting', () => {
      const routeContent = readFile(
        'product/lead-response/dashboard/app/api/auth/trial-signup/route.ts'
      )
      expect(routeContent).toMatch(/sameSite:\s*['"](?:lax|strict)['"]/)
    })

    test('password is bcrypt hashed before storing', () => {
      const routeContent = readFile(
        'product/lead-response/dashboard/app/api/auth/trial-signup/route.ts'
      )
      expect(routeContent).toContain('bcrypt.hash(password')
    })

    test('events/track validates event names against allowlist', () => {
      const routeContent = readFile(
        'product/lead-response/dashboard/app/api/events/track/route.ts'
      )
      expect(routeContent).toContain('VALID_EVENTS.has(event)')
    })
  })
})
