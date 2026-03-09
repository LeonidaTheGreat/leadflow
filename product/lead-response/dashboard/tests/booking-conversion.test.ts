/**
 * Booking Conversion Analytics — Tests
 * 
 * Bug fix: bookings table empty/missing → booking conversion always null
 * Fix: Added lead status='appointment' fallback, return 0 instead of null
 */

interface Lead { id: string; status: string }
interface Booking { lead_id: string }

function computeLeadConversion(
  leads: Lead[],
  bookings: Booking[] | null,
  bookingsError: boolean = false
) {
  const totalLeads = leads.length
  let convertedLeadIds: Set<string>

  if (bookingsError || bookings === null) {
    convertedLeadIds = new Set(
      leads.filter((l) => l.status === 'appointment').map((l) => l.id)
    )
  } else {
    convertedLeadIds = new Set(
      bookings.map((b) => b.lead_id).filter(Boolean)
    )
    leads.forEach((l) => {
      if (l.status === 'appointment') convertedLeadIds.add(l.id)
    })
  }

  const convertedLeads = convertedLeadIds.size
  const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0

  return {
    totalLeads,
    convertedLeads,
    conversionRate: Math.round(conversionRate * 10) / 10,
  }
}

function computeSmsBookingConversion(
  repliedLeadIds: Set<string>,
  bookings: Booking[]
): number {
  if (repliedLeadIds.size === 0) return 0
  const bookedLeads = bookings.filter((b) => repliedLeadIds.has(b.lead_id))
  const uniqueBooked = new Set(bookedLeads.map((b) => b.lead_id))
  return uniqueBooked.size / repliedLeadIds.size
}

describe('Lead Conversion — Bookings Table Available', () => {
  test('returns 0 conversion when no leads exist', () => {
    const result = computeLeadConversion([], [])
    expect(result.totalLeads).toBe(0)
    expect(result.convertedLeads).toBe(0)
    expect(result.conversionRate).toBe(0)
  })

  test('returns 0 conversion when leads exist but no bookings', () => {
    const leads = [
      { id: 'lead-1', status: 'new' },
      { id: 'lead-2', status: 'qualified' },
    ]
    const result = computeLeadConversion(leads, [])
    expect(result.totalLeads).toBe(2)
    expect(result.convertedLeads).toBe(0)
    expect(result.conversionRate).toBe(0)
  })

  test('counts bookings as conversions', () => {
    const leads = [
      { id: 'lead-1', status: 'new' },
      { id: 'lead-2', status: 'qualified' },
      { id: 'lead-3', status: 'new' },
      { id: 'lead-4', status: 'new' },
    ]
    const bookings = [{ lead_id: 'lead-1' }, { lead_id: 'lead-3' }]
    const result = computeLeadConversion(leads, bookings)
    expect(result.convertedLeads).toBe(2)
    expect(result.conversionRate).toBe(50)
  })

  test('also counts leads with appointment status as converted', () => {
    const leads = [
      { id: 'lead-1', status: 'appointment' },
      { id: 'lead-2', status: 'new' },
      { id: 'lead-3', status: 'new' },
    ]
    const result = computeLeadConversion(leads, [])
    expect(result.convertedLeads).toBe(1)
    expect(result.conversionRate).toBe(33.3)
  })

  test('deduplicates when lead has both booking and appointment status', () => {
    const leads = [
      { id: 'lead-1', status: 'appointment' },
      { id: 'lead-2', status: 'new' },
    ]
    const bookings = [{ lead_id: 'lead-1' }]
    const result = computeLeadConversion(leads, bookings)
    expect(result.convertedLeads).toBe(1)
    expect(result.conversionRate).toBe(50)
  })

  test('handles duplicate bookings for same lead', () => {
    const leads = [
      { id: 'lead-1', status: 'new' },
      { id: 'lead-2', status: 'new' },
    ]
    const bookings = [{ lead_id: 'lead-1' }, { lead_id: 'lead-1' }]
    const result = computeLeadConversion(leads, bookings)
    expect(result.convertedLeads).toBe(1)
    expect(result.conversionRate).toBe(50)
  })
})

describe('Lead Conversion — Bookings Table Unavailable (Fallback)', () => {
  test('falls back to lead status=appointment when bookings query fails', () => {
    const leads = [
      { id: 'lead-1', status: 'appointment' },
      { id: 'lead-2', status: 'qualified' },
      { id: 'lead-3', status: 'new' },
    ]
    const result = computeLeadConversion(leads, null, true)
    expect(result.convertedLeads).toBe(1)
    expect(result.conversionRate).toBe(33.3)
  })

  test('returns 0 when bookings query fails and no appointment leads', () => {
    const leads = [
      { id: 'lead-1', status: 'new' },
      { id: 'lead-2', status: 'qualified' },
    ]
    const result = computeLeadConversion(leads, null, true)
    expect(result.convertedLeads).toBe(0)
    expect(result.conversionRate).toBe(0)
  })
})

describe('SMS Stats — Booking Conversion Returns 0 Not Null', () => {
  test('returns 0 when no replied leads (previously returned null)', () => {
    const result = computeSmsBookingConversion(new Set(), [])
    expect(result).toBe(0)
    expect(result).not.toBeNull()
  })

  test('returns 0 when replied leads have no bookings', () => {
    const replied = new Set(['lead-1', 'lead-2'])
    expect(computeSmsBookingConversion(replied, [])).toBe(0)
  })

  test('returns correct rate when bookings exist', () => {
    const replied = new Set(['lead-1', 'lead-2', 'lead-3'])
    const bookings = [{ lead_id: 'lead-1' }]
    expect(computeSmsBookingConversion(replied, bookings)).toBeCloseTo(0.333, 2)
  })

  test('returns 1.0 when all replied leads booked', () => {
    const replied = new Set(['lead-1', 'lead-2'])
    const bookings = [{ lead_id: 'lead-1' }, { lead_id: 'lead-2' }]
    expect(computeSmsBookingConversion(replied, bookings)).toBe(1)
  })
})
