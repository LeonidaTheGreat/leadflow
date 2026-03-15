import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

interface AcceptInviteRequest {
  token: string
}

interface AcceptInviteResponse {
  success: boolean
  agentId?: string
  error?: string
}

/**
 * POST /api/auth/accept-invite
 *
 * Accept a pilot invite via magic token.
 * This endpoint:
 * 1. Validates the token exists and is not expired
 * 2. Updates the agent as email_verified = true and status = 'active'
 * 3. Updates the invite as accepted
 * 4. Creates a session/auth token for the agent
 *
 * Returns: { success: true, agentId } or error
 */
export async function POST(request: NextRequest): Promise<NextResponse<AcceptInviteResponse>> {
  try {
    const body: AcceptInviteRequest = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Missing invite token' },
        { status: 400 }
      )
    }

    // 1. Look up the invite token
    const { data: invite, error: inviteError } = await supabaseServer
      .from('pilot_invites')
      .select('*')
      .eq('token', token)
      .single()

    if (inviteError || !invite) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired invite token' },
        { status: 404 }
      )
    }

    // 2. Check if token is expired
    const now = new Date()
    const expiresAt = new Date(invite.token_expires_at)

    if (expiresAt < now) {
      // Mark as expired in the database
      await supabaseServer
        .from('pilot_invites')
        .update({ status: 'expired' })
        .eq('id', invite.id)

      return NextResponse.json(
        { success: false, error: 'This invite has expired. Please request a new one.' },
        { status: 410 }
      )
    }

    // 3. Check if already accepted
    if (invite.status === 'accepted') {
      return NextResponse.json(
        { success: false, error: 'This invite has already been accepted' },
        { status: 409 }
      )
    }

    const agentId = invite.agent_id

    // 4. Update the agent record
    const { error: updateAgentError } = await supabaseServer
      .from('real_estate_agents')
      .update({
        status: 'active',
        email_verified: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', agentId)

    if (updateAgentError) {
      console.error('Error updating agent:', updateAgentError)
      return NextResponse.json(
        { success: false, error: 'Failed to activate agent account' },
        { status: 500 }
      )
    }

    // 5. Update the invite record
    const { error: updateInviteError } = await supabaseServer
      .from('pilot_invites')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', invite.id)

    if (updateInviteError) {
      console.error('Error updating invite:', updateInviteError)
      return NextResponse.json(
        { success: false, error: 'Failed to accept invite' },
        { status: 500 }
      )
    }

    // 6. Create auth session
    // Note: This would typically involve creating a JWT or session token.
    // For now, we'll rely on the client to handle auth after redirect.
    // The agent can now log in or we can issue a temporary token.

    // Return success
    return NextResponse.json(
      {
        success: true,
        agentId
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error in accept-invite endpoint:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
