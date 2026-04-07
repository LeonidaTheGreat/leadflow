/**
 * @jest-environment node
 */

const mockJson = jest.fn((body: unknown, init?: { status?: number }) => ({
  body,
  status: init?.status ?? 200,
}))

jest.mock('next/server', () => ({
  NextResponse: {
    json: (...args: unknown[]) => mockJson(...args),
  },
}))

const mockStatsSelect = jest.fn()
const mockLeadsLimit = jest.fn()
const mockLeadsOrder = jest.fn()
const mockLeadsSelect = jest.fn()
const mockFrom = jest.fn()
const mockIsPostgrestConfigured = jest.fn(() => true)

jest.mock('@/lib/db', () => ({
  postgrestAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
  isPostgrestConfigured: () => mockIsPostgrestConfigured(),
}))

import { GET as getStats } from '../app/api/dashboard/stats/route'
import { GET as getLeads } from '../app/api/dashboard/leads/route'

describe('dashboard API routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsPostgrestConfigured.mockReturnValue(true)

    mockStatsSelect.mockResolvedValue({ data: [], error: null })
    mockLeadsLimit.mockResolvedValue({ data: [], error: null })
    mockLeadsOrder.mockReturnValue({ limit: mockLeadsLimit })
    mockLeadsSelect.mockReturnValue({ order: mockLeadsOrder })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'dashboard_stats') {
        return { select: mockStatsSelect }
      }

      if (table === 'lead_summary') {
        return { select: mockLeadsSelect }
      }

      throw new Error(`Unexpected table: ${table}`)
    })
  })

  it('returns aggregated dashboard stats', async () => {
    mockStatsSelect.mockResolvedValue({
      data: [
        {
          agent_id: 'agent-1',
          new_leads: 2,
          qualified_leads: 1,
          responded_leads: 1,
          leads_today: 2,
          leads_this_week: 4,
          avg_urgency: 55,
          total_leads: 10,
        },
        {
          agent_id: 'agent-2',
          new_leads: 3,
          qualified_leads: 2,
          responded_leads: 1,
          leads_today: 1,
          leads_this_week: 5,
          avg_urgency: 65,
          total_leads: 8,
        },
      ],
      error: null,
    })

    const response = await getStats()

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      stats: {
        agent_id: 'all',
        new_leads: 5,
        qualified_leads: 3,
        responded_leads: 2,
        leads_today: 3,
        leads_this_week: 9,
        avg_urgency: 120,
        total_leads: 18,
      },
    })
  })

  it('normalizes alternate view column names (new_today, responses_today)', async () => {
    mockStatsSelect.mockResolvedValue({
      data: [
        {
          new_today: 2,
          qualified_leads: 1,
          responses_today: 1,
          total_leads: 10,
        },
        {
          new_today: 3,
          qualified_leads: 2,
          responses_today: 4,
          total_leads: 8,
        },
      ],
      error: null,
    })

    const response = await getStats()

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      stats: {
        agent_id: 'all',
        new_leads: 5,
        qualified_leads: 3,
        responded_leads: 5,
        leads_today: 5,
        leads_this_week: 0,
        avg_urgency: 0,
        total_leads: 18,
      },
    })
  })

  it('returns empty stats (200) when dashboard_stats query fails', async () => {
    mockStatsSelect.mockResolvedValue({
      data: null,
      error: { message: 'relation "dashboard_stats" does not exist' },
    })

    const response = await getStats()

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      stats: {
        agent_id: 'all',
        new_leads: 0,
        qualified_leads: 0,
        responded_leads: 0,
        leads_today: 0,
        leads_this_week: 0,
        avg_urgency: 0,
        total_leads: 0,
      },
    })
  })

  it('returns empty stats when PostgREST is not configured', async () => {
    mockIsPostgrestConfigured.mockReturnValue(false)

    const response = await getStats()

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      stats: {
        agent_id: 'all',
        new_leads: 0,
        qualified_leads: 0,
        responded_leads: 0,
        leads_today: 0,
        leads_this_week: 0,
        avg_urgency: 0,
        total_leads: 0,
      },
    })
  })

  it('returns recent leads without a status filter', async () => {
    mockLeadsLimit.mockResolvedValue({
      data: [{ id: 'lead-1', status: 'new' }],
      error: null,
    })

    const request = {
      nextUrl: new URL('https://example.com/api/dashboard/leads'),
    } as any

    const response = await getLeads(request)

    expect(response.status).toBe(200)
    expect(mockLeadsOrder).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(mockLeadsLimit).toHaveBeenCalledWith(50)
    expect(response.body).toEqual({
      leads: [{ id: 'lead-1', status: 'new' }],
    })
  })

  it('applies the status filter when requested', async () => {
    const mockEq = jest.fn().mockResolvedValue({
      data: [{ id: 'lead-2', status: 'qualified' }],
      error: null,
    })
    mockLeadsLimit.mockReturnValue({ eq: mockEq })

    const request = {
      nextUrl: new URL('https://example.com/api/dashboard/leads?status=qualified'),
    } as any

    const response = await getLeads(request)

    expect(response.status).toBe(200)
    expect(mockEq).toHaveBeenCalledWith('status', 'qualified')
    expect(response.body).toEqual({
      leads: [{ id: 'lead-2', status: 'qualified' }],
    })
  })
})
