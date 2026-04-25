/**
 * @jest-environment node
 */

const mockJson = jest.fn((body: unknown, init?: { status?: number }) => ({
  body,
  status: init?.status ?? 200,
}))

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: (...args: unknown[]) => mockJson(...args),
  },
}))

const mockIsAdminUser = jest.fn()
jest.mock('@/lib/services/AuthService', () => ({
  isAdminUser: (...args: unknown[]) => mockIsAdminUser(...args),
}))

type QueryResult = { data: any; error: any }

function makeQuery(result: QueryResult) {
  const chain: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
  }
  return chain
}

let queryResultsByTable: Record<string, QueryResult> = {}
const mockFrom = jest.fn((table: string) => makeQuery(queryResultsByTable[table] || { data: [], error: null }))

jest.mock('@/lib/db', () => ({
  postgrestAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

const mockCheckSmsDeliveryHealth = jest.fn()
const mockGetA2pRegistrationStatus = jest.fn()
jest.mock('@/lib/sms-delivery-monitor', () => ({
  checkSmsDeliveryHealth: () => mockCheckSmsDeliveryHealth(),
  getA2pRegistrationStatus: () => mockGetA2pRegistrationStatus(),
}))

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn() },
}))

import { GET } from '../app/api/admin/gtm-status/route'
import { NextRequest } from 'next/server'

function makeRequest(): NextRequest {
  return {} as NextRequest
}

describe('GET /api/admin/gtm-status', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsAdminUser.mockResolvedValue(true)
    mockCheckSmsDeliveryHealth.mockResolvedValue({
      status: 'unknown',
      deliveryRate: null,
      totalSent: 0,
      alertMessage: null,
    })
    mockGetA2pRegistrationStatus.mockReturnValue({ status: 'pending', daysPending: 3 })
  })

  it('returns 401 when requester is not admin', async () => {
    mockIsAdminUser.mockResolvedValue(false)
    await GET(makeRequest())

    expect(mockJson).toHaveBeenCalledWith(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  })

  it('marks execution as blocked when outreach has not started and pending action items exist', async () => {
    queryResultsByTable = {
      pilot_recruitment_campaigns: {
        data: [{ id: 'camp-1', name: 'Pilot Outreach Campaign', status: 'active', goal_count: 20 }],
        error: null,
      },
      pilot_recruitment_targets: {
        data: [
          { id: 't1', campaign_id: 'camp-1', status: 'identified', source_channel: 'reddit', created_at: '2026-04-01T00:00:00Z' },
          { id: 't2', campaign_id: 'camp-1', status: 'identified', source_channel: 'linkedin', created_at: '2026-04-02T00:00:00Z' },
        ],
        error: null,
      },
      pilot_invites: { data: [], error: null },
      real_estate_agents: { data: [], error: null },
      pilot_progress: { data: [], error: null },
      action_items: {
        data: [
          {
            id: 'a1',
            title: 'Approve pilot recruitment outreach',
            type: 'decision',
            priority: 1,
            status: 'open',
            awaiting_input: 'Stojan',
            action_needed: 'Start outreach now',
            created_at: '2026-04-04T00:00:00Z',
          },
        ],
        error: null,
      },
    }

    await GET(makeRequest())

    const payload = mockJson.mock.calls[0][0] as any
    expect(payload.success).toBe(true)
    expect(payload.recruitment.targetCount).toBe(2)
    expect(payload.recruitment.contactedCount).toBe(0)
    expect(payload.execution.status).toBe('blocked')
    expect(payload.execution.summary).toContain('Pilot outreach has not happened yet')
    expect(payload.execution.summary).toContain('Stojan action is required')
    expect(payload.actionItems).toHaveLength(1)
  })

  it('does not report outreach-blocked once contact has started', async () => {
    queryResultsByTable = {
      pilot_recruitment_campaigns: {
        data: [{ id: 'camp-1', name: 'Pilot Outreach Campaign', status: 'active', goal_count: 20 }],
        error: null,
      },
      pilot_recruitment_targets: {
        data: [
          { id: 't1', campaign_id: 'camp-1', status: 'contacted', source_channel: 'reddit', created_at: '2026-04-01T00:00:00Z' },
          { id: 't2', campaign_id: 'camp-1', status: 'identified', source_channel: 'linkedin', created_at: '2026-04-02T00:00:00Z' },
        ],
        error: null,
      },
      pilot_invites: { data: [], error: null },
      real_estate_agents: { data: [], error: null },
      pilot_progress: { data: [], error: null },
      action_items: {
        data: [
          {
            id: 'a1',
            title: 'Approve pilot recruitment outreach',
            type: 'decision',
            priority: 1,
            status: 'open',
            awaiting_input: 'Stojan',
            action_needed: 'Review and respond',
            created_at: '2026-04-04T00:00:00Z',
          },
        ],
        error: null,
      },
    }

    await GET(makeRequest())
    const payload = mockJson.mock.calls[0][0] as any

    expect(payload.execution.status).toBe('in_progress')
    expect(payload.execution.summary).toContain('GTM execution is underway')
  })
})
