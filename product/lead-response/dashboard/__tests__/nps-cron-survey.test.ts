/**
 * @jest-environment node
 *
 * Tests for NPS survey cron route and status filter fix
 * Bug: CRON_SECRET auth gate + status filter excluding onboarding agents
 */

import { NextRequest } from 'next/server'

// ---- DB mock ----
const mockFrom = jest.fn()

jest.mock('@/lib/db', () => ({
  createClient: jest.fn(() => ({
    from: (...args: any[]) => mockFrom(...args),
  })),
}))

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

jest.mock('@/lib/nps-email-service', () => ({
  sendNPSSurveyEmail: jest.fn().mockResolvedValue(true),
}))

// ---- Import AFTER mocks ----
import { GET } from '@/app/api/cron/nps-surveys/route'

// ---- Helpers ----
function makeRequest(authHeader?: string): NextRequest {
  const url = new URL('http://localhost/api/cron/nps-surveys')
  return new NextRequest(url.toString(), {
    method: 'GET',
    headers: authHeader ? { authorization: authHeader } : {},
  })
}

function buildChain(result: unknown): any {
  const chain: any = {}
  const methods = ['select', 'lt', 'lte', 'gte', 'order', 'limit', 'eq', 'in', 'insert', 'single']
  methods.forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain)
  })
  chain.then = (resolve: any) => Promise.resolve(result).then(resolve)
  return chain
}

beforeEach(() => {
  jest.clearAllMocks()
  process.env.CRON_SECRET = 'test-cron-secret'
})

afterEach(() => {
  delete process.env.CRON_SECRET
})

// ── CRON_SECRET Auth ──────────────────────────────────────────────────────

describe('CRON_SECRET auth', () => {
  it('returns 503 when CRON_SECRET env var is not set', async () => {
    delete process.env.CRON_SECRET
    const res = await GET(makeRequest('Bearer anything'))
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).toMatch(/CRON_SECRET/i)
  })

  it('returns 401 when Authorization header is missing', async () => {
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns 401 when Authorization header has wrong token', async () => {
    const res = await GET(makeRequest('Bearer wrong-secret'))
    expect(res.status).toBe(401)
  })

  it('returns 200 with correct Bearer token and no agents due', async () => {
    mockFrom.mockReturnValue(buildChain({ data: [], error: null }))
    const res = await GET(makeRequest('Bearer test-cron-secret'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.sent).toBe(0)
  })
})

// ── Status filter ─────────────────────────────────────────────────────────

describe('getAgentsDueForSurvey status filter', () => {
  it('queries with .in() for active, onboarding, and pilot statuses', async () => {
    const chain = buildChain({ data: [], error: null })
    mockFrom.mockReturnValue(chain)

    await GET(makeRequest('Bearer test-cron-secret'))

    expect(mockFrom).toHaveBeenCalledWith('agent_survey_schedule')
    expect(chain.in).toHaveBeenCalledWith(
      'real_estate_agents.status',
      ['active', 'onboarding', 'pilot']
    )
  })

  it('returns agents with onboarding status when due for survey', async () => {
    const { sendNPSSurveyEmail } = require('@/lib/nps-email-service')
    const chain = buildChain({
      data: [
        {
          agent_id: 'agent-1',
          survey_count: 0,
          real_estate_agents: {
            email: 'test@example.com',
            first_name: 'Jane',
            last_name: 'Doe',
          },
        },
      ],
      error: null,
    })
    mockFrom.mockReturnValue(chain)

    const res = await GET(makeRequest('Bearer test-cron-secret'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sent).toBe(1)
    expect(sendNPSSurveyEmail).toHaveBeenCalledWith(
      'test@example.com',
      'agent-1',
      'Jane Doe',
      expect.any(String)
    )
  })
})
