import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { postgrestAdmin } from '@/lib/db'
import { logger } from '@/lib/logger'

interface AcceptInviteRequest {
  token: string
}

interface AcceptInviteResponse {
  success: boolean
  agentId?: string
  email?: string
  name?: string
  needsPassword?: boolean
  error?: string
}

const supabase = postgrestAdmin

/**
 * POST /api/auth/accept-invite
 *
 * Validate a pilot invite token and ensure an agent record exists.
 * Does NOT set the password — that's handled by /api/auth/set-password.
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

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const { data: invite, error: inviteError } = await supabase
      .from('pilot_invites')
      .select('*')
      .eq('token', tokenHash)
      .single()

    if (inviteError || !invite) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired invite token' },
        { status: 404 }
      )
    }

    const now = new Date()
    const expiresAt = new Date(invite.token_expires_at)

    if (expiresAt < now) {
      await supabase
        .from('pilot_invites')
        .update({ status: 'expired' })
        .eq('id', invite.id)

      return NextResponse.json(
        { success: false, error: 'This invite has expired. Please request a new one.' },
        { status: 410 }
      )
    }

    if (invite.accepted_at || invite.status === 'accepted') {
      return NextResponse.json(
        { success: false, error: 'This invite has already been accepted' },
        { status: 409 }
      )
    }

    let agentId: string

    if (invite.agent_id) {
      agentId = invite.agent_id
    } else {
      const names = (invite.name || '').trim().split(' ')
      const firstName = names[0] || 'Agent'
      const lastName = names.slice(1).join(' ') || ''

      const { data: newAgent, error: createAgentError } = await supabase
        .from('real_estate_agents')
        .insert({
          email: invite.email.toLowerCase(),
          first_name: firstName,
          last_name: lastName,
          password_hash: 'invited',
          source: 'pilot_invite',
          status: 'invited',
          email_verified: true,
          plan_tier: 'pilot',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single()

      if (createAgentError || !newAgent) {
        logger.error('Error creating agent:', createAgentError)
        return NextResponse.json(
          { success: false, error: 'Failed to create agent account' },
          { status: 500 }
        )
      }

      agentId = newAgent.id

      await supabase
        .from('pilot_invites')
        .update({ agent_id: agentId })
        .eq('id', invite.id)
    }

    return NextResponse.json(
      {
        success: true,
        agentId,
        email: invite.email,
        name: invite.name || '',
        needsPassword: true
      },
      { status: 200 }
    )
  } catch (error: any) {
    logger.error('Error in accept-invite endpoint:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
