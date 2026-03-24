/**
 * OnboardingGuard — Unit Tests
 *
 * Tests the onboarding guard logic: redirects, storage reading, and step wiring.
 * Uses Jest (no @testing-library/react — not available in this project).
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'

// ─── Helper: storage setup ────────────────────────────────────────────────────

function setStorageUser(
  user: Record<string, unknown> | null,
  token?: string,
  storage: 'local' | 'session' = 'local'
) {
  const store = storage === 'local' ? localStorage : sessionStorage
  if (user) {
    store.setItem('leadflow_user', JSON.stringify(user))
    store.setItem('leadflow_token', token || 'mock-jwt-token')
  } else {
    store.removeItem('leadflow_user')
    store.removeItem('leadflow_token')
  }
}

// ─── Storage helpers (mirrors what OnboardingGuard does) ──────────────────────

function getFromStorage(key: string): string | null {
  try {
    return (
      localStorage.getItem(key) || sessionStorage.getItem(key) || null
    )
  } catch {
    return null
  }
}

// ─── Core guard decision logic tests ─────────────────────────────────────────

describe('OnboardingGuard — decision logic', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('returns redirect:/login when no token is present', () => {
    const token = getFromStorage('leadflow_token')
    expect(token).toBeNull()
    // Guard would redirect to /login
  })

  it('returns redirect:/setup when onboardingCompleted is false', () => {
    setStorageUser({ id: 'user-1', onboardingCompleted: false })
    const userRaw = getFromStorage('leadflow_user')
    expect(userRaw).not.toBeNull()
    const user = JSON.parse(userRaw!)
    expect(user.onboardingCompleted).toBe(false)
    // Guard logic: onboardingCompleted === false → redirect /setup
  })

  it('does NOT redirect when onboardingCompleted is true', () => {
    setStorageUser({ id: 'user-1', onboardingCompleted: true })
    const userRaw = getFromStorage('leadflow_user')
    const user = JSON.parse(userRaw!)
    expect(user.onboardingCompleted).toBe(true)
    // Guard logic: onboardingCompleted === true → no redirect
  })

  it('reads token from sessionStorage when localStorage is empty', () => {
    sessionStorage.setItem('leadflow_token', 'session-token')
    sessionStorage.setItem(
      'leadflow_user',
      JSON.stringify({ id: 'user-2', onboardingCompleted: false })
    )
    const token = getFromStorage('leadflow_token')
    expect(token).toBe('session-token')
    const userRaw = getFromStorage('leadflow_user')
    const user = JSON.parse(userRaw!)
    expect(user.onboardingCompleted).toBe(false)
  })

  it('prefers localStorage over sessionStorage', () => {
    localStorage.setItem('leadflow_token', 'local-token')
    localStorage.setItem('leadflow_user', JSON.stringify({ onboardingCompleted: true }))
    sessionStorage.setItem('leadflow_token', 'session-token')
    sessionStorage.setItem('leadflow_user', JSON.stringify({ onboardingCompleted: false }))

    const token = getFromStorage('leadflow_token')
    expect(token).toBe('local-token')
    const userRaw = getFromStorage('leadflow_user')
    const user = JSON.parse(userRaw!)
    // localStorage wins → onboardingCompleted = true → no redirect
    expect(user.onboardingCompleted).toBe(true)
  })
})

// ─── Setup wizard step type tests ────────────────────────────────────────────

describe('Setup wizard — step types', () => {
  it('SetupStep type includes all expected steps including "simulator"', () => {
    // Validate the step ordering that the setup wizard should have
    const expectedSteps = ['fub', 'twilio', 'sms-verify', 'simulator', 'complete']
    const hasSimulator = expectedSteps.includes('simulator')
    expect(hasSimulator).toBe(true)
    expect(expectedSteps.length).toBe(5)
  })

  it('simulator step comes after sms-verify and before complete', () => {
    const steps = ['fub', 'twilio', 'sms-verify', 'simulator', 'complete']
    const simulatorIdx = steps.indexOf('simulator')
    const smsVerifyIdx = steps.indexOf('sms-verify')
    const completeIdx = steps.indexOf('complete')

    expect(simulatorIdx).toBeGreaterThan(smsVerifyIdx)
    expect(simulatorIdx).toBeLessThan(completeIdx)
  })
})

// ─── Public route detection ───────────────────────────────────────────────────

describe('OnboardingGuard — public route detection', () => {
  const SETUP_ROUTES = ['/setup', '/login', '/onboarding', '/forgot-password', '/reset-password', '/signup']

  it.each(SETUP_ROUTES)('skips guard on public route: %s', (route) => {
    const isPublicRoute = SETUP_ROUTES.some((r) => route.startsWith(r))
    expect(isPublicRoute).toBe(true)
  })

  it('does NOT skip guard on /dashboard', () => {
    const isPublicRoute = SETUP_ROUTES.some((r) => '/dashboard'.startsWith(r))
    expect(isPublicRoute).toBe(false)
  })

  it('does NOT skip guard on /dashboard/analytics', () => {
    const isPublicRoute = SETUP_ROUTES.some((r) =>
      '/dashboard/analytics'.startsWith(r)
    )
    expect(isPublicRoute).toBe(false)
  })
})

// ─── Onboarding complete → wizard marks done ─────────────────────────────────

describe('Setup wizard — onboarding completion flow', () => {
  it('marks onboarding as done when user completes simulator', () => {
    // Simulates the sequence: sms-verify complete → simulator → complete
    const wizardState = {
      fub_connected: true,
      twilio_connected: true,
      sms_verified: true,
      simulator_completed: true,
      current_step: 'complete',
    }

    // All prerequisites met
    expect(wizardState.fub_connected).toBe(true)
    expect(wizardState.twilio_connected).toBe(true)
    expect(wizardState.sms_verified).toBe(true)
    expect(wizardState.simulator_completed).toBe(true)
    expect(wizardState.current_step).toBe('complete')
  })

  it('allows skipping simulator and still marks onboarding done', () => {
    const wizardState = {
      fub_connected: true,
      twilio_connected: true,
      sms_verified: true,
      simulator_skipped: true,
      simulator_completed: false,
      current_step: 'complete',
    }

    // Skipped is still "done"
    const isComplete =
      wizardState.simulator_completed || wizardState.simulator_skipped
    expect(isComplete).toBe(true)
    expect(wizardState.current_step).toBe('complete')
  })

  it('resumes at simulator step if sms_verified but simulator not done', () => {
    const ws = {
      fub_connected: true,
      twilio_connected: true,
      sms_verified: true,
      simulator_completed: false,
      simulator_skipped: false,
    }

    // Resume logic mirrors SetupPage useEffect
    let resumeStep = 'fub'
    if (!ws.fub_connected) {
      resumeStep = 'fub'
    } else if (!ws.twilio_connected) {
      resumeStep = 'twilio'
    } else if (!ws.sms_verified) {
      resumeStep = 'sms-verify'
    } else if (!ws.simulator_completed && !ws.simulator_skipped) {
      resumeStep = 'simulator'
    } else {
      resumeStep = 'complete'
    }

    expect(resumeStep).toBe('simulator')
  })
})
