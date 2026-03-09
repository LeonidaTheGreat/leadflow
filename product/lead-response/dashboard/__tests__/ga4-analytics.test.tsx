/**
 * GA4 Analytics — Unit Tests
 *
 * Covers:
 *   - trackEvent() core helper (SSR-safe, no-op when gtag absent)
 *   - trackCTAClick() (FR-2 / US-1)
 *   - trackScrollMilestone() (FR-3 / US-2)
 *   - trackFormEvent() (FR-4 / US-3)
 *   - attachScrollMilestoneObservers() cleanup
 *   - No PII in event parameters (NFR-2 / E2E-ANA-4)
 */

import {
  trackEvent,
  trackCTAClick,
  trackScrollMilestone,
  trackFormEvent,
  attachScrollMilestoneObservers,
} from '@/lib/analytics/ga4'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setupGtag() {
  const calls: Array<[string, ...unknown[]]> = []
  const mockGtag = jest.fn((...args: unknown[]) => {
    calls.push(args as [string, ...unknown[]])
  })
  Object.defineProperty(window, 'gtag', {
    value: mockGtag,
    writable: true,
    configurable: true,
  })
  return { calls, mockGtag }
}

function removeGtag() {
  // @ts-expect-error intentionally removing gtag
  delete window.gtag
}

// ─── trackEvent ──────────────────────────────────────────────────────────────

describe('trackEvent()', () => {
  afterEach(() => removeGtag())

  it('calls window.gtag with event name and params when gtag is available', () => {
    const { mockGtag } = setupGtag()
    trackEvent('test_event', { key: 'value' })
    expect(mockGtag).toHaveBeenCalledWith('event', 'test_event', { key: 'value' })
  })

  it('is a no-op when window.gtag is not defined', () => {
    removeGtag()
    expect(() => trackEvent('test_event', { key: 'value' })).not.toThrow()
  })

  it('passes params as-is to gtag', () => {
    const { mockGtag } = setupGtag()
    const params = { foo: 'bar', num: 42 }
    trackEvent('my_event', params)
    expect(mockGtag).toHaveBeenCalledWith('event', 'my_event', params)
  })
})

// ─── trackCTAClick (FR-2) ────────────────────────────────────────────────────

describe('trackCTAClick() — FR-2 / US-1', () => {
  afterEach(() => removeGtag())

  it('fires cta_click with correct parameters', () => {
    const { mockGtag } = setupGtag()
    trackCTAClick('join_pilot_hero', "Join the Pilot — It's Free", 'hero')
    expect(mockGtag).toHaveBeenCalledWith('event', 'cta_click', {
      cta_id: 'join_pilot_hero',
      cta_label: "Join the Pilot — It's Free",
      section: 'hero',
      page_url: expect.any(String),
    })
  })

  it('includes correct cta_id for nav CTA', () => {
    const { mockGtag } = setupGtag()
    trackCTAClick('join_pilot_nav', 'Join Free Pilot', 'navigation')
    const callArgs = mockGtag.mock.calls[0]
    const params = callArgs[2] as Record<string, unknown>
    expect(params.cta_id).toBe('join_pilot_nav')
    expect(params.section).toBe('navigation')
  })

  it('includes correct cta_id for pricing CTAs', () => {
    const { mockGtag } = setupGtag()
    trackCTAClick('pricing_starter', 'Get Starter', 'pricing')
    const params = mockGtag.mock.calls[0][2] as Record<string, unknown>
    expect(params.cta_id).toBe('pricing_starter')
    expect(params.section).toBe('pricing')
  })

  // NFR-2: No PII in CTA events
  it('does not include PII (email, phone, name) in event parameters', () => {
    const { mockGtag } = setupGtag()
    trackCTAClick('join_pilot_hero', "Join the Pilot", 'hero')
    const params = mockGtag.mock.calls[0][2] as Record<string, unknown>
    const serialized = JSON.stringify(params)
    expect(serialized).not.toMatch(/@/)
    expect(serialized).not.toMatch(/\+1/)
    expect(serialized).not.toMatch(/email|phone|password/i)
  })
})

// ─── trackScrollMilestone (FR-3) ─────────────────────────────────────────────

describe('trackScrollMilestone() — FR-3 / US-2', () => {
  afterEach(() => removeGtag())

  const MILESTONES = [25, 50, 75, 90] as const

  MILESTONES.forEach((pct) => {
    it(`fires scroll_milestone with percent_scrolled=${pct}`, () => {
      const { mockGtag } = setupGtag()
      trackScrollMilestone(pct)
      expect(mockGtag).toHaveBeenCalledWith('event', 'scroll_milestone', {
        percent_scrolled: pct,
        page_url: expect.any(String),
      })
    })
  })
})

// ─── trackFormEvent (FR-4) ───────────────────────────────────────────────────

describe('trackFormEvent() — FR-4 / US-3', () => {
  afterEach(() => removeGtag())

  const FORM_EVENTS = [
    'form_view',
    'form_start',
    'form_submit_attempt',
    'pilot_signup_complete',
    'form_submit_error',
  ] as const

  FORM_EVENTS.forEach((eventName) => {
    it(`fires ${eventName} with form_id`, () => {
      const { mockGtag } = setupGtag()
      trackFormEvent(eventName, 'pilot_signup')
      expect(mockGtag).toHaveBeenCalledWith('event', eventName, expect.objectContaining({
        form_id: 'pilot_signup',
      }))
    })
  })

  it('uses "pilot_signup" as default form_id', () => {
    const { mockGtag } = setupGtag()
    trackFormEvent('form_start')
    const params = mockGtag.mock.calls[0][2] as Record<string, unknown>
    expect(params.form_id).toBe('pilot_signup')
  })

  it('merges extra params into event', () => {
    const { mockGtag } = setupGtag()
    trackFormEvent('form_submit_error', 'pilot_signup', {
      error_type: 'network_error',
    })
    const params = mockGtag.mock.calls[0][2] as Record<string, unknown>
    expect(params.error_type).toBe('network_error')
  })

  // NFR-2: No PII in form events
  it('does not include email, name, or phone in event params', () => {
    const { mockGtag } = setupGtag()
    // extra params must not contain PII — crm and lead_volume are OK
    trackFormEvent('pilot_signup_complete', 'pilot_signup', {
      crm: 'follow_up_boss',
      lead_volume: '11-50',
    })
    const params = mockGtag.mock.calls[0][2] as Record<string, unknown>
    const serialized = JSON.stringify(params)
    expect(serialized).not.toMatch(/@/)
    expect(serialized).not.toMatch(/email|phone|name/i)
  })

  // Funnel ordering: US-3 states events must be trackable in sequence
  it('fires in the correct funnel sequence (view → start → attempt → complete)', () => {
    const { mockGtag } = setupGtag()
    const sequence: string[] = ['form_view', 'form_start', 'form_submit_attempt', 'pilot_signup_complete']
    sequence.forEach((ev) => trackFormEvent(ev as Parameters<typeof trackFormEvent>[0]))
    const firedNames = mockGtag.mock.calls.map((c) => c[1])
    expect(firedNames).toEqual(sequence)
  })
})

// ─── attachScrollMilestoneObservers ──────────────────────────────────────────

describe('attachScrollMilestoneObservers()', () => {
  it('returns a cleanup function that disconnects all observers', () => {
    const disconnectMock = jest.fn()
    const observeMock = jest.fn()
    const mockObserver = { observe: observeMock, disconnect: disconnectMock }
    window.IntersectionObserver = jest.fn().mockImplementation(() => mockObserver) as unknown as typeof IntersectionObserver

    const el1 = document.createElement('div')
    const el2 = document.createElement('div')
    const el3 = document.createElement('div')

    const cleanup = attachScrollMilestoneObservers([el1, el2, el3])
    expect(observeMock).toHaveBeenCalledTimes(3)

    cleanup()
    expect(disconnectMock).toHaveBeenCalledTimes(3)
  })

  it('skips null elements gracefully', () => {
    const disconnectMock = jest.fn()
    const observeMock = jest.fn()
    const mockObserver = { observe: observeMock, disconnect: disconnectMock }
    window.IntersectionObserver = jest.fn().mockImplementation(() => mockObserver) as unknown as typeof IntersectionObserver

    const el1 = document.createElement('div')
    // el2 is null
    const el3 = document.createElement('div')

    expect(() => attachScrollMilestoneObservers([el1, null, el3])).not.toThrow()
    expect(observeMock).toHaveBeenCalledTimes(2)
  })
})
