/**
 * Cal.com Booking Links — Unit Tests
 *
 * Tests for generateBookingLinkFromUrl (lib/calcom.ts).
 * Covers: prefill params, UTM tracking, URL preservation, edge cases.
 */

import { generateBookingLinkFromUrl } from '../lib/calcom'

describe('generateBookingLinkFromUrl', () => {
  const BASE_URL = 'https://cal.com/john-doe/30min'

  it('appends UTM params when no lead info provided', () => {
    const link = generateBookingLinkFromUrl(BASE_URL)
    expect(link).toContain('utm_source=ai-lead-response')
    expect(link).toContain('utm_medium=sms')
    expect(link.startsWith(BASE_URL)).toBe(true)
  })

  it('appends lead name as prefill param', () => {
    const link = generateBookingLinkFromUrl(BASE_URL, { leadName: 'Jane Smith' })
    const url = new URL(link)
    expect(url.searchParams.get('name')).toBe('Jane Smith')
  })

  it('appends lead email as prefill param', () => {
    const link = generateBookingLinkFromUrl(BASE_URL, { leadEmail: 'jane@example.com' })
    const url = new URL(link)
    expect(url.searchParams.get('email')).toBe('jane@example.com')
  })

  it('appends lead phone as prefill param', () => {
    const link = generateBookingLinkFromUrl(BASE_URL, { leadPhone: '+15551234567' })
    const url = new URL(link)
    expect(url.searchParams.get('phone')).toBe('+15551234567')
  })

  it('appends all prefill params together', () => {
    const link = generateBookingLinkFromUrl(BASE_URL, {
      leadName: 'Jane Smith',
      leadEmail: 'jane@example.com',
      leadPhone: '+15551234567',
    })
    const url = new URL(link)
    expect(url.searchParams.get('name')).toBe('Jane Smith')
    expect(url.searchParams.get('email')).toBe('jane@example.com')
    expect(url.searchParams.get('phone')).toBe('+15551234567')
    expect(url.searchParams.get('utm_source')).toBe('ai-lead-response')
    expect(url.searchParams.get('utm_medium')).toBe('sms')
  })

  it('omits name param when leadName is undefined', () => {
    const link = generateBookingLinkFromUrl(BASE_URL, { leadEmail: 'jane@example.com' })
    const url = new URL(link)
    expect(url.searchParams.has('name')).toBe(false)
  })

  it('omits email param when leadEmail is undefined', () => {
    const link = generateBookingLinkFromUrl(BASE_URL, { leadName: 'Jane' })
    const url = new URL(link)
    expect(url.searchParams.has('email')).toBe(false)
  })

  it('preserves the event slug path in the URL', () => {
    const urlWithSlug = 'https://cal.com/agent-username/property-tour'
    const link = generateBookingLinkFromUrl(urlWithSlug, { leadName: 'Bob' })
    expect(link.startsWith('https://cal.com/agent-username/property-tour?')).toBe(true)
  })

  it('strips existing query params from the stored URL (rebuilds cleanly)', () => {
    // Stored URL might have stale params — we always rebuild from scratch
    const urlWithStaleParams = 'https://cal.com/john-doe/30min?name=old&email=old@example.com'
    const link = generateBookingLinkFromUrl(urlWithStaleParams, { leadName: 'New Name' })
    const url = new URL(link)
    expect(url.searchParams.get('name')).toBe('New Name')
    expect(url.searchParams.get('email')).toBeNull()
  })

  it('works with cal.dev domain (test environments)', () => {
    const devUrl = 'https://app.cal.dev/john-doe/30min'
    const link = generateBookingLinkFromUrl(devUrl, { leadName: 'Tester' })
    expect(link.startsWith('https://app.cal.dev/john-doe/30min?')).toBe(true)
    const url = new URL(link)
    expect(url.searchParams.get('name')).toBe('Tester')
  })
})
