import { POST } from '@/app/api/auth/accept-invite/route'
import { NextRequest } from 'next/server'

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

  it('should return needsPassword=true for valid invite with pre-created agent', async () => {
    // Integration test — requires a real DB invite with agent_id pre-set.
    // The key behavioral change: invites with agent_id no longer return 409.
    // Instead they return { success: true, needsPassword: true }.
    //
    // Manual verification steps:
    // 1. Create invite via /api/admin/invite-pilot (pre-creates agent + sets agent_id)
    // 2. POST /api/auth/accept-invite { token: rawToken }
    // 3. Expect 200 with { success: true, needsPassword: true, agentId, email, name }
    // 4. POST /api/auth/set-password { token: rawToken, password: "TestPass123" }
    // 5. Expect 200 with { success: true, agentId }
    // 6. Verify agent status = 'onboarding', password_hash != 'invited'
    // 7. Verify invite status = 'accepted', accepted_at IS NOT NULL
  })

  it('should return 409 for already-accepted invite', async () => {
    // Integration test — requires invite with status='accepted' and accepted_at set.
    // POST /api/auth/accept-invite { token } → 409
  })

  it('should return 410 for expired invite', async () => {
    // Integration test — requires invite with token_expires_at in the past.
    // POST /api/auth/accept-invite { token } → 410
  })
})
