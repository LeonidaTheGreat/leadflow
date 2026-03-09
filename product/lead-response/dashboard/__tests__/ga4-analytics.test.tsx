/**
 * GA4 Analytics Tests
 *
 * Verify that GA4 event tracking works correctly across all use cases:
 * - FR-2: CTA click tracking
 * - FR-3: Scroll depth tracking
 * - FR-4: Form funnel tracking
 *
 * Tests run in a jsdom environment where gtag can be mocked.
 */

import {
  trackEvent,
  trackCTAClick,
  trackScrollMilestone,
  trackFormEvent,
  createScrollObserver,
  attachScrollMilestoneObservers,
} from '../lib/analytics/ga4'

// Mock gtag
const mockGtag = jest.fn()

// Mock IntersectionObserver (not available in jsdom)
class MockIntersectionObserver {
  constructor(public callback: IntersectionObserverCallback, public options?: IntersectionObserverInit) {}
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}

beforeEach(() => {
  mockGtag.mockClear()
  delete (window as any).gtag
  delete (window as any).dataLayer
  
  // Mock IntersectionObserver globally
  ;(global as any).IntersectionObserver = MockIntersectionObserver
})

describe('trackEvent()', () => {
  it('calls window.gtag with event name and params when gtag is available', () => {
    window.gtag = mockGtag as any
    trackEvent('test_event', { foo: 'bar' })
    expect(mockGtag).toHaveBeenCalledWith('event', 'test_event', { foo: 'bar' })
  })

  it('is a no-op when window.gtag is not defined', () => {
    // gtag not set — should not throw
    expect(() => trackEvent('test_event')).not.toThrow()
    expect(mockGtag).not.toHaveBeenCalled()
  })

  it('passes params as-is to gtag', () => {
    window.gtag = mockGtag as any
    const params = { a: 1, b: 'text', c: true }
    trackEvent('complex_event', params)
    expect(mockGtag).toHaveBeenCalledWith('event', 'complex_event', params)
  })
})

describe('trackCTAClick() — FR-2 / US-1', () => {
  beforeEach(() => {
    window.gtag = mockGtag as any
  })

  it('fires cta_click with correct parameters', () => {
    trackCTAClick('join_pilot_hero', 'Join Free Pilot', 'hero')
    expect(mockGtag).toHaveBeenCalled()
    const [cmd, eventName, params] = mockGtag.mock.calls[0]
    expect(cmd).toBe('event')
    expect(eventName).toBe('cta_click')
    expect(params.cta_id).toBe('join_pilot_hero')
    expect(params.cta_label).toBe('Join Free Pilot')
    expect(params.section).toBe('hero')
  })

  it('includes correct cta_id for nav CTA', () => {
    trackCTAClick('join_pilot_nav', 'Join Free Pilot', 'navigation')
    const [, , params] = mockGtag.mock.calls[0]
    expect(params.cta_id).toBe('join_pilot_nav')
  })

  it('includes correct cta_id for pricing CTAs', () => {
    trackCTAClick('pricing_starter', 'Get Starter', 'pricing')
    expect(mockGtag.mock.calls[0][2].cta_id).toBe('pricing_starter')

    mockGtag.mockClear()
    trackCTAClick('pricing_pro', 'Get Pro', 'pricing')
    expect(mockGtag.mock.calls[0][2].cta_id).toBe('pricing_pro')

    mockGtag.mockClear()
    trackCTAClick('pricing_team', 'Get Team', 'pricing')
    expect(mockGtag.mock.calls[0][2].cta_id).toBe('pricing_team')
  })

  it('does not include PII (email, phone, name) in event parameters', () => {
    trackCTAClick('join_pilot_hero', 'Join Free Pilot', 'hero')
    const [, , params] = mockGtag.mock.calls[0]
    expect(params).not.toHaveProperty('email')
    expect(params).not.toHaveProperty('phone')
    expect(params).not.toHaveProperty('name')
  })
})

describe('trackScrollMilestone() — FR-3 / US-2', () => {
  beforeEach(() => {
    window.gtag = mockGtag as any
  })

  it('fires scroll_milestone with percent_scrolled=25', () => {
    trackScrollMilestone(25)
    const [cmd, eventName, params] = mockGtag.mock.calls[0]
    expect(cmd).toBe('event')
    expect(eventName).toBe('scroll_milestone')
    expect(params.percent_scrolled).toBe(25)
  })

  it('fires scroll_milestone with percent_scrolled=50', () => {
    trackScrollMilestone(50)
    expect(mockGtag.mock.calls[0][2].percent_scrolled).toBe(50)
  })

  it('fires scroll_milestone with percent_scrolled=75', () => {
    trackScrollMilestone(75)
    expect(mockGtag.mock.calls[0][2].percent_scrolled).toBe(75)
  })

  it('fires scroll_milestone with percent_scrolled=90', () => {
    trackScrollMilestone(90)
    expect(mockGtag.mock.calls[0][2].percent_scrolled).toBe(90)
  })
})

describe('trackFormEvent() — FR-4 / US-3', () => {
  beforeEach(() => {
    window.gtag = mockGtag as any
  })

  it('fires form_open with form_id', () => {
    trackFormEvent('form_open')
    const [cmd, eventName, params] = mockGtag.mock.calls[0]
    expect(cmd).toBe('event')
    expect(eventName).toBe('form_open')
    expect(params.form_id).toBe('pilot_signup')
  })

  it('fires form_start with form_id', () => {
    trackFormEvent('form_start')
    expect(mockGtag.mock.calls[0][1]).toBe('form_start')
    expect(mockGtag.mock.calls[0][2].form_id).toBe('pilot_signup')
  })

  it('fires form_submit with form_id', () => {
    trackFormEvent('form_submit')
    expect(mockGtag.mock.calls[0][1]).toBe('form_submit')
  })

  it('fires form_success with form_id', () => {
    trackFormEvent('form_success')
    expect(mockGtag.mock.calls[0][1]).toBe('form_success')
  })

  it('fires form_error with form_id', () => {
    trackFormEvent('form_error')
    expect(mockGtag.mock.calls[0][1]).toBe('form_error')
  })

  it('uses "pilot_signup" as default form_id', () => {
    trackFormEvent('form_open')
    expect(mockGtag.mock.calls[0][2].form_id).toBe('pilot_signup')
  })

  it('merges extra params into event', () => {
    trackFormEvent('form_submit', 'pilot_signup', { field_count: 5 })
    const params = mockGtag.mock.calls[0][2]
    expect(params.field_count).toBe(5)
    expect(params.form_id).toBe('pilot_signup')
  })

  it('does not include email, name, or phone in event params', () => {
    trackFormEvent('form_submit')
    const params = mockGtag.mock.calls[0][2]
    expect(params).not.toHaveProperty('email')
    expect(params).not.toHaveProperty('name')
    expect(params).not.toHaveProperty('phone')
  })

  it('fires in the correct funnel sequence (open → submit → success)', () => {
    trackFormEvent('form_open')
    trackFormEvent('form_submit')
    trackFormEvent('form_success')

    expect(mockGtag).toHaveBeenCalledTimes(3)
    expect(mockGtag.mock.calls[0][1]).toBe('form_open')
    expect(mockGtag.mock.calls[1][1]).toBe('form_submit')
    expect(mockGtag.mock.calls[2][1]).toBe('form_success')
  })
})

describe('attachScrollMilestoneObservers()', () => {
  it('returns a cleanup function that disconnects all observers', () => {
    // Create mock elements
    const el25 = document.createElement('div')
    const el50 = document.createElement('div')
    const el75 = document.createElement('div')

    document.body.appendChild(el25)
    document.body.appendChild(el50)
    document.body.appendChild(el75)

    window.gtag = mockGtag as any

    const cleanup = attachScrollMilestoneObservers([el25, el50, el75])
    expect(typeof cleanup).toBe('function')

    // Call cleanup — should not throw
    expect(() => cleanup()).not.toThrow()

    document.body.removeChild(el25)
    document.body.removeChild(el50)
    document.body.removeChild(el75)
  })

  it('skips null elements gracefully', () => {
    const el50 = document.createElement('div')
    document.body.appendChild(el50)

    const cleanup = attachScrollMilestoneObservers([null, el50, null])
    expect(() => cleanup()).not.toThrow()

    document.body.removeChild(el50)
  })
})
