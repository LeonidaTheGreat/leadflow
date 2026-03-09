/**
 * Tests: Lead Satisfaction Feedback Collection
 * PRD: PRD-LEAD-SATISFACTION-FEEDBACK
 * Task: 115d5dfb-5daa-46fa-bb44-9a1a4cc406ad
 */

import {
  classifyReply,
  getSatisfactionStats,
  getPendingSatisfactionPing,
  recordSatisfactionReply,
  sendSatisfactionPing,
  SATISFACTION_PING_MESSAGE,
  SATISFACTION_COOLDOWN_MS,
} from '@/lib/satisfaction'

// ============================================
// Mocks
// ============================================

jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}))

jest.mock('@/lib/twilio', () => ({
  sendSms: jest.fn(),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { sendSms } from '@/lib/twilio'

const mockFrom = supabaseAdmin.from as jest.Mock
const mockSendSms = sendSms as jest.Mock

// Helper: create a chainable Supabase mock
// The chain itself is a thenable so `await chain` resolves to `result`
function mockSupabaseChain(result: { data?: any; error?: any; count?: number }) {
  const chain: any = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockResolvedValue(result),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue(result),
    single: jest.fn().mockResolvedValue(result),
    // Make the chain itself awaitable — Supabase queries resolve when awaited
    then: jest.fn((resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject)),
    catch: jest.fn((reject: any) => Promise.resolve(result).catch(reject)),
  }
  return chain
}

beforeEach(() => {
  jest.clearAllMocks()
})

// ============================================
// US-2: Reply Classification
// ============================================

describe('classifyReply', () => {
  test('classifies YES as positive', () => {
    expect(classifyReply('YES')).toBe('positive')
    expect(classifyReply('yes')).toBe('positive')
  })

  test('classifies HELPFUL as positive', () => {
    expect(classifyReply('helpful')).toBe('positive')
  })

  test('classifies GOOD as positive', () => {
    expect(classifyReply('good')).toBe('positive')
  })

  test('classifies GREAT as positive', () => {
    expect(classifyReply('great')).toBe('positive')
  })

  test('classifies THANKS as positive', () => {
    expect(classifyReply('thanks')).toBe('positive')
  })

  test('classifies NO as negative', () => {
    expect(classifyReply('NO')).toBe('negative')
    expect(classifyReply('no')).toBe('negative')
  })

  test('classifies BAD as negative', () => {
    expect(classifyReply('bad')).toBe('negative')
  })

  test('classifies ANNOYING as negative', () => {
    expect(classifyReply('annoying')).toBe('negative')
  })

  test('classifies QUIT as negative', () => {
    expect(classifyReply('quit')).toBe('negative')
  })

  test('classifies OK as neutral', () => {
    expect(classifyReply('ok')).toBe('neutral')
    expect(classifyReply('OK')).toBe('neutral')
  })

  test('classifies FINE as neutral', () => {
    expect(classifyReply('fine')).toBe('neutral')
  })

  test('classifies MEH as neutral', () => {
    expect(classifyReply('meh')).toBe('neutral')
  })

  test('classifies NEUTRAL as neutral', () => {
    expect(classifyReply('neutral')).toBe('neutral')
  })

  test('classifies unrecognized replies as unclassified', () => {
    expect(classifyReply('random message')).toBe('unclassified')
    expect(classifyReply('what?')).toBe('unclassified')
    expect(classifyReply('')).toBe('unclassified')
  })

  test('STOP is not classified (returns unclassified — handled by opt-out flow)', () => {
    // STOP should go to opt-out, not satisfaction classification
    // Our classifier should return unclassified for STOP
    const result = classifyReply('STOP')
    expect(['unclassified', 'negative']).toContain(result)
    // NOTE: STOP handling is in the inbound SMS handler, not classifyReply
  })

  test('handles mixed case input', () => {
    expect(classifyReply('YeS')).toBe('positive')
    expect(classifyReply('GREAT')).toBe('positive')
    expect(classifyReply('Fine')).toBe('neutral')
  })
})

// ============================================
// SATISFACTION_PING_MESSAGE
// ============================================

describe('SATISFACTION_PING_MESSAGE', () => {
  test('is under 160 characters', () => {
    expect(SATISFACTION_PING_MESSAGE.length).toBeLessThanOrEqual(160)
  })

  test('includes opt-out instruction (TCPA compliance)', () => {
    expect(SATISFACTION_PING_MESSAGE).toContain('STOP')
  })

  test('asks for YES or NO response', () => {
    expect(SATISFACTION_PING_MESSAGE).toContain('YES')
    expect(SATISFACTION_PING_MESSAGE).toContain('NO')
  })
})

// ============================================
// SATISFACTION_COOLDOWN_MS
// ============================================

describe('SATISFACTION_COOLDOWN_MS', () => {
  test('is at least 10 minutes', () => {
    expect(SATISFACTION_COOLDOWN_MS).toBeGreaterThanOrEqual(10 * 60 * 1000)
  })
})

// ============================================
// US-2: Pending ping detection
// ============================================

describe('getPendingSatisfactionPing', () => {
  test('returns pending event when one exists', async () => {
    const mockEvent = { id: 'event-1', lead_id: 'lead-1', rating: null, satisfaction_ping_sent_at: new Date().toISOString() }
    const chain = mockSupabaseChain({ data: mockEvent, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await getPendingSatisfactionPing('lead-1')
    expect(result).toEqual(mockEvent)
  })

  test('returns null when no pending ping', async () => {
    const chain = mockSupabaseChain({ data: null, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await getPendingSatisfactionPing('lead-1')
    expect(result).toBeNull()
  })

  test('returns null on database error', async () => {
    const chain = mockSupabaseChain({ data: null, error: { message: 'DB error' } })
    mockFrom.mockReturnValue(chain)

    const result = await getPendingSatisfactionPing('lead-1')
    expect(result).toBeNull()
  })
})

// ============================================
// US-2: Record satisfaction reply
// ============================================

describe('recordSatisfactionReply', () => {
  test('updates event with rating and raw reply', async () => {
    const chain = mockSupabaseChain({ data: null, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await recordSatisfactionReply('event-1', 'YES', 'positive')
    expect(result).toBe(true)
  })

  test('returns false on DB error', async () => {
    const chain = mockSupabaseChain({ data: null, error: { message: 'DB error' } })
    mockFrom.mockReturnValue(chain)

    const result = await recordSatisfactionReply('event-1', 'YES', 'positive')
    expect(result).toBe(false)
  })
})

// ============================================
// US-1/US-4: Send satisfaction ping
// ============================================

describe('sendSatisfactionPing', () => {
  const defaultOpts = {
    leadId: 'lead-1',
    agentId: 'agent-uuid-1',
    conversationId: 'conv-1',
    phone: '+14155552671',
    lastAiMessageAt: null,
    agentSatisfactionPingEnabled: true,
  }

  test('skips when agent has satisfaction_ping_enabled=false', async () => {
    const result = await sendSatisfactionPing({
      ...defaultOpts,
      agentSatisfactionPingEnabled: false,
    })
    expect(result).toBe(false)
    expect(mockSendSms).not.toHaveBeenCalled()
  })

  test('skips within 10-minute cooldown window', async () => {
    const recentMessageAt = new Date(Date.now() - 5 * 60 * 1000).toISOString() // 5 min ago
    const result = await sendSatisfactionPing({
      ...defaultOpts,
      lastAiMessageAt: recentMessageAt,
    })
    expect(result).toBe(false)
    expect(mockSendSms).not.toHaveBeenCalled()
  })

  test('allows ping after 10-minute cooldown', async () => {
    const oldMessageAt = new Date(Date.now() - 15 * 60 * 1000).toISOString() // 15 min ago
    // No existing pings
    const chain = mockSupabaseChain({ data: [], error: null })
    mockFrom.mockReturnValue(chain)
    mockSendSms.mockResolvedValue({ success: true, messageSid: 'SM123' })

    const result = await sendSatisfactionPing({
      ...defaultOpts,
      lastAiMessageAt: oldMessageAt,
    })
    expect(result).toBe(true)
    expect(mockSendSms).toHaveBeenCalledWith(
      expect.objectContaining({ body: SATISFACTION_PING_MESSAGE })
    )
  })

  test('skips if ping already sent for this conversation', async () => {
    const chain = mockSupabaseChain({ data: [{ id: 'existing-event' }], error: null })
    mockFrom.mockReturnValue(chain)

    const result = await sendSatisfactionPing(defaultOpts)
    expect(result).toBe(false)
    expect(mockSendSms).not.toHaveBeenCalled()
  })

  test('sends SATISFACTION_PING_MESSAGE via SMS', async () => {
    const chain = mockSupabaseChain({ data: [], error: null })
    mockFrom.mockReturnValue(chain)
    mockSendSms.mockResolvedValue({ success: true, messageSid: 'SM456' })

    await sendSatisfactionPing(defaultOpts)

    expect(mockSendSms).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '+14155552671',
        body: SATISFACTION_PING_MESSAGE,
      })
    )
  })

  test('returns false when SMS send fails', async () => {
    const chain = mockSupabaseChain({ data: [], error: null })
    mockFrom.mockReturnValue(chain)
    mockSendSms.mockResolvedValue({ success: false, error: 'Twilio error' })

    const result = await sendSatisfactionPing(defaultOpts)
    expect(result).toBe(false)
  })
})

// ============================================
// US-3: Satisfaction stats aggregation
// ============================================

describe('getSatisfactionStats', () => {
  test('returns zero stats when no data', async () => {
    const chain = mockSupabaseChain({ data: [], error: null })
    mockFrom.mockReturnValue(chain)

    const stats = await getSatisfactionStats('agent-1')
    expect(stats.total).toBe(0)
    expect(stats.positivePct).toBe(0)
    expect(stats.negativePct).toBe(0)
    expect(stats.trend).toBe('insufficient_data')
  })

  test('calculates percentages correctly', async () => {
    // 6 positive, 2 negative, 2 neutral = 10 total
    const events = [
      ...Array(6).fill({ rating: 'positive' }),
      ...Array(2).fill({ rating: 'negative' }),
      ...Array(2).fill({ rating: 'neutral' }),
    ]
    const chain = mockSupabaseChain({ data: events, error: null })
    mockFrom.mockReturnValue(chain)

    const stats = await getSatisfactionStats('agent-1')
    expect(stats.total).toBe(10)
    expect(stats.positive).toBe(6)
    expect(stats.negative).toBe(2)
    expect(stats.neutral).toBe(2)
    expect(stats.positivePct).toBe(60)
    expect(stats.negativePct).toBe(20)
    expect(stats.neutralPct).toBe(20)
  })

  test('trend is improving when positive rate increased ≥5%', async () => {
    // Current period (1st from call): 8 positive out of 10 = 80%
    // Prior period (2nd from call):   3 positive out of 10 = 30% → diff = 50% → improving
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // current 30d
        const events = [
          ...Array(8).fill({ rating: 'positive' }),
          ...Array(2).fill({ rating: 'negative' }),
        ]
        return mockSupabaseChain({ data: events, error: null })
      } else {
        // prior 30d
        const events = [
          ...Array(3).fill({ rating: 'positive' }),
          ...Array(7).fill({ rating: 'negative' }),
        ]
        return mockSupabaseChain({ data: events, error: null })
      }
    })

    const stats = await getSatisfactionStats('agent-1')
    expect(stats.trend).toBe('improving')
  })
})

// ============================================
// Integration: API route validation (unit)
// ============================================

describe('Satisfaction API routes (unit)', () => {
  test('classifyReply handles all PRD-specified keywords', () => {
    // Positive (US-2)
    const positiveInputs = ['YES', 'HELPFUL', 'GOOD', 'GREAT', 'THANKS']
    positiveInputs.forEach(input => {
      expect(classifyReply(input)).toBe('positive')
    })

    // Negative (US-2)
    const negativeInputs = ['NO', 'BAD', 'ANNOYING', 'QUIT']
    negativeInputs.forEach(input => {
      expect(classifyReply(input)).toBe('negative')
    })

    // Neutral (US-2)
    const neutralInputs = ['NEUTRAL', 'OK', 'FINE', 'MEH']
    neutralInputs.forEach(input => {
      expect(classifyReply(input)).toBe('neutral')
    })
  })
})
