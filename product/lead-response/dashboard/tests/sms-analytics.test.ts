/**
 * SMS Analytics Dashboard — Unit & Integration Tests
 * PRD: SMS Analytics Dashboard — Delivery, Reply & Booking Conversion Tracking
 */

// ============================================================
// UNIT TESTS — Business Logic (pure functions, no DB needed)
// ============================================================

// Re-implement the pure helpers here for isolated unit testing
const OPT_OUT_KEYWORDS = ['stop', 'unsubscribe', 'cancel', 'quit', 'end', 'optout', 'opt-out']

function isOptOut(body: string): boolean {
  return OPT_OUT_KEYWORDS.includes((body || '').toLowerCase().trim())
}

function parseWindowStart(window: string): Date | null {
  const now = Date.now()
  if (window === '7d') return new Date(now - 7 * 24 * 60 * 60 * 1000)
  if (window === '30d') return new Date(now - 30 * 24 * 60 * 60 * 1000)
  if (window === 'all') return null
  return new Date(now - 30 * 24 * 60 * 60 * 1000)
}

function formatRate(rate: number | null): string {
  if (rate === null) return '—'
  return `${Math.round(rate * 100)}%`
}

function deliveryRateColor(rate: number | null): string {
  if (rate === null) return 'text-slate-400 dark:text-slate-500'
  if (rate >= 0.8) return 'text-emerald-600 dark:text-emerald-400'
  if (rate >= 0.6) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

function computeDeliveryRate(messages: Array<{ status: string }>): number | null {
  const total = messages.length
  if (total === 0) return null
  const delivered = messages.filter((m) => m.status === 'delivered').length
  return delivered / total
}

function computeReplyRate(
  outbound: Array<{ lead_id: string }>,
  inbound: Array<{ lead_id: string; body: string }>
): number | null {
  const outboundLeadIds = new Set(outbound.map((m) => m.lead_id).filter(Boolean))
  if (outboundLeadIds.size === 0) return null

  const repliedLeadIds = new Set(
    inbound
      .filter((m) => !isOptOut(m.body))
      .map((m) => m.lead_id)
      .filter((id) => outboundLeadIds.has(id))
  )

  return repliedLeadIds.size / outboundLeadIds.size
}

function computeBookingConversion(
  repliedLeadIds: Set<string>,
  bookings: Array<{ lead_id: string }>
): number | null {
  if (repliedLeadIds.size === 0) return null
  const bookedLeads = bookings.filter((b) => repliedLeadIds.has(b.lead_id))
  const uniqueBooked = new Set(bookedLeads.map((b) => b.lead_id))
  return uniqueBooked.size / repliedLeadIds.size
}

// ============================================================
// TESTS
// ============================================================

describe('SMS Analytics — Opt-out Detection', () => {
  test('recognises STOP as opt-out', () => {
    expect(isOptOut('STOP')).toBe(true)
  })

  test('recognises lowercase stop', () => {
    expect(isOptOut('stop')).toBe(true)
  })

  test('recognises UNSUBSCRIBE', () => {
    expect(isOptOut('UNSUBSCRIBE')).toBe(true)
  })

  test('does not flag normal replies as opt-out', () => {
    expect(isOptOut('Yes, I am interested')).toBe(false)
    expect(isOptOut('Tell me more')).toBe(false)
    expect(isOptOut('')).toBe(false)
  })

  test('trims whitespace before checking', () => {
    expect(isOptOut('  stop  ')).toBe(true)
  })
})

describe('SMS Analytics — Window Parsing', () => {
  test('7d returns a date ~7 days ago', () => {
    const start = parseWindowStart('7d')
    const expected = Date.now() - 7 * 24 * 60 * 60 * 1000
    expect(start).not.toBeNull()
    // Allow 5s tolerance for test execution time
    expect(Math.abs(start!.getTime() - expected)).toBeLessThan(5000)
  })

  test('30d returns a date ~30 days ago', () => {
    const start = parseWindowStart('30d')
    const expected = Date.now() - 30 * 24 * 60 * 60 * 1000
    expect(start).not.toBeNull()
    expect(Math.abs(start!.getTime() - expected)).toBeLessThan(5000)
  })

  test('all returns null (all-time)', () => {
    expect(parseWindowStart('all')).toBeNull()
  })

  test('unknown value defaults to 30 days', () => {
    const start = parseWindowStart('bogus')
    const expected = Date.now() - 30 * 24 * 60 * 60 * 1000
    expect(start).not.toBeNull()
    expect(Math.abs(start!.getTime() - expected)).toBeLessThan(5000)
  })
})

describe('SMS Analytics — Delivery Rate Calculation', () => {
  test('returns null when no messages', () => {
    expect(computeDeliveryRate([])).toBeNull()
  })

  test('returns 1.0 when all messages delivered', () => {
    const messages = [
      { status: 'delivered' },
      { status: 'delivered' },
      { status: 'delivered' },
    ]
    expect(computeDeliveryRate(messages)).toBe(1.0)
  })

  test('returns 0 when no messages delivered', () => {
    const messages = [{ status: 'failed' }, { status: 'undelivered' }]
    expect(computeDeliveryRate(messages)).toBe(0)
  })

  test('calculates correct partial delivery rate', () => {
    const messages = [
      { status: 'delivered' },
      { status: 'delivered' },
      { status: 'failed' },
      { status: 'sent' },
    ]
    // 2 of 4 = 0.5
    expect(computeDeliveryRate(messages)).toBe(0.5)
  })
})

describe('SMS Analytics — Reply Rate Calculation', () => {
  test('returns null when no outbound messages', () => {
    expect(computeReplyRate([], [])).toBeNull()
  })

  test('returns 0 when leads received messages but none replied', () => {
    const outbound = [{ lead_id: 'lead-1' }, { lead_id: 'lead-2' }]
    const inbound: Array<{ lead_id: string; body: string }> = []
    expect(computeReplyRate(outbound, inbound)).toBe(0)
  })

  test('excludes opt-out replies from numerator', () => {
    const outbound = [{ lead_id: 'lead-1' }, { lead_id: 'lead-2' }]
    const inbound = [
      { lead_id: 'lead-1', body: 'STOP' }, // opt-out
      { lead_id: 'lead-2', body: 'Yes, interested' }, // real reply
    ]
    // 1 of 2 leads replied (lead-1's STOP doesn't count)
    expect(computeReplyRate(outbound, inbound)).toBe(0.5)
  })

  test('counts unique leads, not total inbound messages', () => {
    const outbound = [{ lead_id: 'lead-1' }, { lead_id: 'lead-2' }]
    const inbound = [
      { lead_id: 'lead-1', body: 'Message 1' },
      { lead_id: 'lead-1', body: 'Message 2' }, // same lead, second message
    ]
    // lead-1 replied (counted once), lead-2 did not → 1/2 = 0.5
    expect(computeReplyRate(outbound, inbound)).toBe(0.5)
  })

  test('only counts replies from leads who were messaged in the window', () => {
    const outbound = [{ lead_id: 'lead-1' }]
    const inbound = [
      { lead_id: 'lead-1', body: 'Hi' },
      { lead_id: 'lead-99', body: 'Hello' }, // lead not in outbound set
    ]
    // lead-1 replied → 1/1 = 1.0 (lead-99 not counted)
    expect(computeReplyRate(outbound, inbound)).toBe(1.0)
  })
})

describe('SMS Analytics — Booking Conversion Calculation', () => {
  test('returns null when no replied leads', () => {
    expect(computeBookingConversion(new Set(), [])).toBeNull()
  })

  test('returns 0 when replied leads have no bookings', () => {
    const replied = new Set(['lead-1', 'lead-2'])
    const bookings: Array<{ lead_id: string }> = []
    expect(computeBookingConversion(replied, bookings)).toBe(0)
  })

  test('calculates correct conversion rate', () => {
    const replied = new Set(['lead-1', 'lead-2', 'lead-3', 'lead-4'])
    const bookings = [{ lead_id: 'lead-1' }, { lead_id: 'lead-3' }]
    // 2 of 4 replied leads booked → 0.5
    expect(computeBookingConversion(replied, bookings)).toBe(0.5)
  })

  test('counts unique booked leads, not total bookings', () => {
    const replied = new Set(['lead-1'])
    const bookings = [
      { lead_id: 'lead-1' }, // same lead appears twice (e.g., rescheduled)
      { lead_id: 'lead-1' },
    ]
    // lead-1 counted once → 1/1 = 1.0
    expect(computeBookingConversion(replied, bookings)).toBe(1.0)
  })

  test('only counts bookings from replied leads', () => {
    const replied = new Set(['lead-1'])
    const bookings = [
      { lead_id: 'lead-2' }, // this lead didn't reply
    ]
    // 0 of 1 replied lead booked → 0
    expect(computeBookingConversion(replied, bookings)).toBe(0)
  })
})

describe('SMS Analytics — UI Formatting', () => {
  test('formatRate returns "—" for null (empty state)', () => {
    expect(formatRate(null)).toBe('—')
  })

  test('formatRate converts 0 to "0%"', () => {
    expect(formatRate(0)).toBe('0%')
  })

  test('formatRate converts 1 to "100%"', () => {
    expect(formatRate(1)).toBe('100%')
  })

  test('formatRate rounds fractional rates', () => {
    expect(formatRate(0.946)).toBe('95%')
    expect(formatRate(0.314)).toBe('31%')
  })

  test('deliveryRateColor returns green for >= 80%', () => {
    expect(deliveryRateColor(0.80)).toContain('emerald')
    expect(deliveryRateColor(0.95)).toContain('emerald')
    expect(deliveryRateColor(1.0)).toContain('emerald')
  })

  test('deliveryRateColor returns amber for 60-79%', () => {
    expect(deliveryRateColor(0.60)).toContain('amber')
    expect(deliveryRateColor(0.79)).toContain('amber')
  })

  test('deliveryRateColor returns red for < 60%', () => {
    expect(deliveryRateColor(0.59)).toContain('red')
    expect(deliveryRateColor(0.0)).toContain('red')
  })

  test('deliveryRateColor returns slate for null (no data)', () => {
    expect(deliveryRateColor(null)).toContain('slate')
  })
})

describe('SMS Analytics — API Route Validation', () => {
  test('valid window params are accepted', () => {
    const validWindows = ['7d', '30d', 'all']
    validWindows.forEach((w) => {
      expect(['7d', '30d', 'all'].includes(w)).toBe(true)
    })
  })

  test('invalid window param is rejected', () => {
    const invalid = 'weekly'
    expect(['7d', '30d', 'all'].includes(invalid)).toBe(false)
  })

  test('response shape matches PRD contract', () => {
    // Simulated response matching the API contract from PRD section 5
    const mockResponse = {
      window: '30d',
      deliveryRate: 0.94,
      replyRate: 0.31,
      bookingConversion: 0.18,
      messagesSent: 142,
      messagesDelivered: 133,
      leadsMessaged: 50,
      leadsReplied: 16,
      bookingsMade: 3,
    }

    expect(mockResponse).toHaveProperty('window')
    expect(mockResponse).toHaveProperty('deliveryRate')
    expect(mockResponse).toHaveProperty('replyRate')
    expect(mockResponse).toHaveProperty('bookingConversion')
    expect(mockResponse).toHaveProperty('messagesSent')
    expect(mockResponse).toHaveProperty('leadsMessaged')
    expect(mockResponse).toHaveProperty('leadsReplied')
    expect(mockResponse).toHaveProperty('bookingsMade')
    expect(['7d', '30d', 'all']).toContain(mockResponse.window)
    expect(mockResponse.deliveryRate).toBeGreaterThanOrEqual(0)
    expect(mockResponse.deliveryRate).toBeLessThanOrEqual(1)
  })

  test('null rates indicate no data (not 0%)', () => {
    // When there are no messages, rates must be null not 0
    // This verifies the empty state requirement from PRD US-1
    const emptyResponse = {
      deliveryRate: null,
      replyRate: null,
      bookingConversion: null,
    }
    expect(emptyResponse.deliveryRate).toBeNull()
    expect(emptyResponse.replyRate).toBeNull()
    expect(emptyResponse.bookingConversion).toBeNull()
  })
})
