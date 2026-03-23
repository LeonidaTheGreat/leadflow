/**
 * Test: Onboarding Simulator API - Start Action SessionId Fix
 * 
 * Tests that the start action works correctly:
 * 1. Can be called without sessionId (server generates one)
 * 2. Can be called with sessionId (client-provided, backward compatible)
 * 3. Returns the sessionId in the response
 * 4. Status and skip actions still require sessionId
 */

const { describe, it, expect, beforeAll } = require('@jest/globals');

// Mock the supabase server module
jest.mock('@/lib/supabase-server', () => ({
  supabaseServer: {
    from: jest.fn(() => ({
      insert: jest.fn().mockReturnValue({ error: null }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } })
            })
          })
        }),
        single: jest.fn().mockResolvedValue({ data: { agent_id: 'test-agent-id' }, error: null })
      }),
      upsert: jest.fn().mockReturnValue({ error: null }),
      update: jest.fn().mockReturnValue({ error: null })
    }))
  }
}));

// Mock next/server
const mockJson = jest.fn();
const mockNextResponse = {
  json: jest.fn((data, init) => ({
    status: init?.status || 200,
    json: async () => data
  }))
};

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: mockNextResponse
}));

// Mock crypto
jest.mock('crypto', () => ({
  randomUUID: jest.fn().mockReturnValue('mocked-uuid-12345')
}));

describe('Onboarding Simulator API - Start Action', () => {
  let POST: any;

  beforeAll(async () => {
    // Import the route handler after mocks are set up
    const route = await import('./route');
    POST = route.POST;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/onboarding/simulator', () => {
    it('should accept start action without sessionId and generate one', async () => {
      const request = {
        json: jest.fn().mockResolvedValue({
          action: 'start',
          agentId: 'agent-123'
          // No sessionId provided
        })
      };

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.state.session_id).toBe('mocked-uuid-12345');
    });

    it('should accept start action with client-provided sessionId', async () => {
      const clientSessionId = 'client-session-123';
      const request = {
        json: jest.fn().mockResolvedValue({
          action: 'start',
          agentId: 'agent-123',
          sessionId: clientSessionId
        })
      };

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.state.session_id).toBe(clientSessionId);
    });

    it('should require sessionId for status action', async () => {
      const request = {
        json: jest.fn().mockResolvedValue({
          action: 'status',
          agentId: 'agent-123'
          // No sessionId provided
        })
      };

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('sessionId');
    });

    it('should require sessionId for skip action', async () => {
      const request = {
        json: jest.fn().mockResolvedValue({
          action: 'skip',
          agentId: 'agent-123'
          // No sessionId provided
        })
      };

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('sessionId');
    });

    it('should require action and agentId', async () => {
      const request = {
        json: jest.fn().mockResolvedValue({
          action: 'start'
          // No agentId
        })
      };

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should handle status action with sessionId', async () => {
      const request = {
        json: jest.fn().mockResolvedValue({
          action: 'status',
          agentId: 'agent-123',
          sessionId: 'session-123'
        })
      };

      const response = await POST(request);
      
      // Should not return 400 (sessionId is provided)
      expect(response.status).not.toBe(400);
    });

    it('should handle skip action with sessionId', async () => {
      const request = {
        json: jest.fn().mockResolvedValue({
          action: 'skip',
          agentId: 'agent-123',
          sessionId: 'session-123',
          reason: 'User skipped'
        })
      };

      const response = await POST(request);
      
      // Should not return 400 (sessionId is provided)
      expect(response.status).not.toBe(400);
    });
  });
});
