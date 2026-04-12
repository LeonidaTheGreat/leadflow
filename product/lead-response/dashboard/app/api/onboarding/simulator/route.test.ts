/**
 * Tests for onboarding simulator API route behavior.
 */

const { describe, it, expect, beforeAll, beforeEach } = require('@jest/globals')

const fromMock = jest.fn()
const mockInsert = jest.fn()
const mockUpsert = jest.fn()
const mockSingle = jest.fn()
const mockSimulationUpdate = jest.fn()
const mockSimulationUpdateEq = jest.fn()
const mockAgentUpdate = jest.fn()
const mockAgentUpdateEq = jest.fn()

jest.mock('@/lib/supabase-server', () => ({
  supabaseServer: {
    from: fromMock,
  },
}))

jest.mock('@/lib/services/AuthService', () => ({
  getAuthUserId: jest.fn().mockResolvedValue(null),
}))

const mockNextResponse = {
  json: jest.fn((data, init) => ({
    status: init?.status || 200,
    json: async () => data,
  })),
}

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: mockNextResponse,
}))

jest.mock('crypto', () => ({
  randomUUID: jest.fn().mockReturnValue('mocked-uuid-12345'),
  randomBytes: jest.fn((size) => {
    const buffer = Buffer.alloc(size)
    for (let i = 0; i < size; i += 1) {
      buffer[i] = (i * 37 + 42) % 256
    }
    return buffer
  }),
}))

describe('Onboarding Simulator API', () => {
  let POST

  beforeAll(async () => {
    const route = await import('./route')
    POST = route.POST
  })

  beforeEach(() => {
    jest.clearAllMocks()

    mockInsert.mockResolvedValue({ error: null })
    mockUpsert.mockResolvedValue({ error: null })
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } })
    mockSimulationUpdateEq.mockResolvedValue({ error: null })
    mockAgentUpdateEq.mockResolvedValue({ error: null })

    fromMock.mockImplementation((table) => {
      if (table === 'onboarding_simulations') {
        return {
          insert: mockInsert,
          upsert: mockUpsert,
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  single: mockSingle,
                }),
              }),
            }),
          }),
          update: mockSimulationUpdate.mockImplementation((payload) => ({
            eq: mockSimulationUpdateEq.mockImplementation(async (column, value) => ({ error: null, payload, column, value })),
          })),
        }
      }

      if (table === 'real_estate_agents') {
        return {
          update: mockAgentUpdate.mockImplementation((payload) => ({
            eq: mockAgentUpdateEq.mockImplementation(async (column, value) => ({ error: null, payload, column, value })),
          })),
        }
      }

      if (table === 'onboarding_events') {
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    })
  })

  describe('POST /api/onboarding/simulator', () => {
    it('accepts start action without sessionId and generates one', async () => {
      const request = {
        json: jest.fn().mockResolvedValue({
          action: 'start',
          agentId: 'agent-123',
        }),
      }

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.state.session_id).toBe('sim_mocked-uuid-12345')
    })

    it('accepts start action with client-provided sessionId', async () => {
      const clientSessionId = 'client-session-123'
      const request = {
        json: jest.fn().mockResolvedValue({
          action: 'start',
          agentId: 'agent-123',
          sessionId: clientSessionId,
        }),
      }

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.state.session_id).toBe(clientSessionId)
    })

    it('requires sessionId for status action', async () => {
      const request = {
        json: jest.fn().mockResolvedValue({
          action: 'status',
          agentId: 'agent-123',
        }),
      }

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('sessionId')
    })

    it('requires sessionId for skip action', async () => {
      const request = {
        json: jest.fn().mockResolvedValue({
          action: 'skip',
          agentId: 'agent-123',
        }),
      }

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('sessionId')
    })

    it('requires action and agentId', async () => {
      const request = {
        json: jest.fn().mockResolvedValue({
          action: 'start',
        }),
      }

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing required fields')
    })

    it('handles status action with sessionId', async () => {
      mockSingle.mockResolvedValueOnce({
        data: {
          id: 'sim-1',
          session_id: 'session-123',
          agent_id: 'agent-123',
          status: 'running',
          simulation_started_at: new Date().toISOString(),
          conversation: [],
          lead_name: 'Taylor',
        },
        error: null,
      })

      const request = {
        json: jest.fn().mockResolvedValue({
          action: 'status',
          agentId: 'agent-123',
          sessionId: 'session-123',
        }),
      }

      const response = await POST(request)

      expect(response.status).not.toBe(400)
    })

    it('handles skip action with sessionId', async () => {
      const request = {
        json: jest.fn().mockResolvedValue({
          action: 'skip',
          agentId: 'agent-123',
          sessionId: 'session-123',
          reason: 'User skipped',
        }),
      }

      const response = await POST(request)

      expect(response.status).not.toBe(400)
    })

    it('persists aha completion to real_estate_agents when a simulation succeeds', async () => {
      const startedAt = new Date(Date.now() - 15_000).toISOString()
      mockSingle.mockResolvedValueOnce({
        data: {
          id: 'sim-success',
          session_id: 'session-success',
          agent_id: 'agent-123',
          status: 'running',
          simulation_started_at: startedAt,
          conversation: [],
          lead_name: 'Jordan',
          inbound_received_at: null,
          ai_response_received_at: null,
          response_time_ms: null,
        },
        error: null,
      })

      const request = {
        json: jest.fn().mockResolvedValue({
          action: 'status',
          agentId: 'agent-123',
          sessionId: 'session-success',
        }),
      }

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.state.status).toBe('success')
      expect(mockSimulationUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          aha_moment_reached: true,
        })
      )
      expect(mockSimulationUpdateEq).toHaveBeenCalledWith('session_id', 'session-success')
      expect(mockAgentUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          aha_completed: true,
        })
      )
      expect(mockAgentUpdateEq).toHaveBeenCalledWith('id', 'agent-123')
    })
  })
})
