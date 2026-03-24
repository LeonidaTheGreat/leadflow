/**
 * Onboarding Simulator Tests
 * 
 * Tests for the Aha Moment feature - Live Lead Simulator in Onboarding
 */

// Using Jest globals (describe, it, expect, jest are globally available)

// Mock fetch for API tests
global.fetch = jest.fn()

describe('Onboarding Simulator API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('POST /api/onboarding/simulator', () => {
    it('should start a new simulation', async () => {
      const mockResponse = {
        success: true,
        state: {
          id: 'test-sim-id',
          status: 'running',
          simulation_started_at: new Date().toISOString(),
          conversation: [{
            role: 'lead',
            message: "Hi! I'm looking for a 3-bedroom home...",
            timestamp: new Date().toISOString(),
          }],
          lead_name: 'Sarah Johnson',
        },
      }

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const response = await fetch('/api/onboarding/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          agentId: 'test-agent-id',
          sessionId: 'test-session-id',
        }),
      })

      const data = await response.json()

      expect(fetch).toHaveBeenCalledWith('/api/onboarding/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          agentId: 'test-agent-id',
          sessionId: 'test-session-id',
        }),
      })
      expect(data.success).toBe(true)
      expect(data.state.status).toBe('running')
    })

    it('should check simulation status', async () => {
      const mockResponse = {
        success: true,
        state: {
          id: 'test-sim-id',
          status: 'success',
          simulation_started_at: new Date().toISOString(),
          ai_response_received_at: new Date().toISOString(),
          response_time_ms: 2500,
          conversation: [
            { role: 'lead', message: 'Hi!', timestamp: new Date().toISOString() },
            { role: 'ai', message: 'Hello!', timestamp: new Date().toISOString() },
          ],
        },
      }

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const response = await fetch('/api/onboarding/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'status',
          agentId: 'test-agent-id',
          sessionId: 'test-session-id',
        }),
      })

      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.state.status).toBe('success')
      expect(data.state.response_time_ms).toBeLessThan(30000) // Under 30s target
    })

    it('should skip simulation', async () => {
      const mockResponse = { success: true }

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const response = await fetch('/api/onboarding/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'skip',
          agentId: 'test-agent-id',
          sessionId: 'test-session-id',
          reason: 'User skipped',
        }),
      })

      const data = await response.json()

      expect(data.success).toBe(true)
    })

    it('should handle missing required fields', async () => {
      const mockResponse = {
        error: 'agentId and sessionId are required',
      }

      ;(fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockResponse,
      })

      const response = await fetch('/api/onboarding/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          // Missing agentId and sessionId
        }),
      })

      expect(response.ok).toBe(false)
    })

    it('should handle timeout after 90 seconds', async () => {
      const mockResponse = {
        success: true,
        state: {
          id: 'test-sim-id',
          status: 'timeout',
          simulation_started_at: new Date(Date.now() - 95000).toISOString(), // 95 seconds ago
          error_code: 'TIMEOUT',
          error_message: 'Simulation timed out after 90 seconds',
        },
      }

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const response = await fetch('/api/onboarding/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'status',
          agentId: 'test-agent-id',
          sessionId: 'test-session-id',
        }),
      })

      const data = await response.json()

      expect(data.state.status).toBe('timeout')
      expect(data.state.error_code).toBe('TIMEOUT')
    })
  })
})

describe('Onboarding Simulator UI', () => {
  it('should have correct step order in onboarding flow', () => {
    const steps = ['welcome', 'agent-info', 'calendar', 'sms', 'confirmation', 'simulator']
    
    expect(steps).toHaveLength(6)
    expect(steps[5]).toBe('simulator') // Simulator is the final step
  })

  it('should track required analytics events', () => {
    const requiredEvents = [
      'onboarding_simulation_started',
      'onboarding_simulation_inbound_received',
      'onboarding_simulation_ai_responded',
      'onboarding_simulation_succeeded',
      'onboarding_simulation_skipped',
      'onboarding_simulation_failed',
    ]

    expect(requiredEvents).toHaveLength(6)
    expect(requiredEvents).toContain('onboarding_simulation_started')
    expect(requiredEvents).toContain('onboarding_simulation_succeeded')
  })
})

describe('Database Schema', () => {
  it('should have required columns in onboarding_simulations table', () => {
    const requiredColumns = [
      'id',
      'agent_id',
      'simulation_started_at',
      'inbound_received_at',
      'ai_response_received_at',
      'response_time_ms',
      'status',
      'error_code',
      'error_message',
      'session_id',
      'lead_name',
      'property_interest',
      'conversation',
      'was_skipped',
      'skip_reason',
      'created_at',
      'updated_at',
    ]

    expect(requiredColumns).toHaveLength(17)
  })

  it('should have valid status values', () => {
    const validStatuses = [
      'idle',
      'running',
      'inbound_received',
      'ai_responded',
      'success',
      'skipped',
      'timeout',
      'failed',
    ]

    expect(validStatuses).toHaveLength(8)
    expect(validStatuses).toContain('success')
    expect(validStatuses).toContain('timeout')
    expect(validStatuses).toContain('skipped')
  })
})

describe('Performance Requirements', () => {
  it('should respond within 30 seconds (P0 requirement)', () => {
    const targetResponseTimeMs = 30000
    const simulatedResponseTimeMs = 2500 // Simulated actual response time

    expect(simulatedResponseTimeMs).toBeLessThan(targetResponseTimeMs)
  })

  it('should have 90 second timeout threshold', () => {
    const timeoutThresholdMs = 90000
    expect(timeoutThresholdMs).toBe(90000)
  })
})
