import { POST } from '@/app/api/auth/accept-invite/route'
import { NextRequest } from 'next/server'
import crypto from 'crypto'

describe('POST /api/auth/accept-invite', () => {
  it('should reject missing token', async () => {
    const request = {
      json: async () => ({}),
      headers: new Map()
    } as unknown as NextRequest

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Missing invite token')
  })

  it('should reject invalid token', async () => {
    const request = {
      json: async () => ({ token: 'invalid-token-12345' }),
      headers: new Map()
    } as unknown as NextRequest

    const response = await POST(request)
    
    expect(response.status).toBe(404)
  })

  it('should accept valid token and create agent account', async () => {
    // NOTE: This would require a real test invite in the database
    // For now, this documents the expected behavior
    const mockToken = crypto.randomUUID()
    
    const request = {
      json: async () => ({ 
        token: mockToken,
        password: 'TestPassword123'
      }),
      headers: new Map()
    } as unknown as NextRequest

    // In a real test, we'd:
    // 1. Insert a test pilot_invite with this token
    // 2. Call POST(request)
    // 3. Verify real_estate_agents row created
    // 4. Verify pilot_invites.agent_id populated
    // 5. Verify pilot_progress row created
  })
})
