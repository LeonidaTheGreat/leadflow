import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { postgrestAdmin } from '@/lib/db'
import { logger } from '@/lib/logger'

interface AcceptInviteRequest {
  token: string
  password?: string
}

interface AcceptInviteResponse {
  success: boolean
  agentId?: string
  error?: string
}

const supabase = postgrestAdmin

/**
 * POST /api/auth/accept-invite
 *
 * Accept a pilot invite via magic token.
 * This endpoint:
 * 1. Validates the token exists, is not expired, and status is 'invited'
 * 2. Creates a new real_estate_agent account (email, name from invite)
 * 3. Generates random password if not provided
 * 4. Updates the invite as accepted with agent_id
 * 5. Creates a pilot_progress record
 *
 * Returns: { success: true, agentId } or error
 */
export async function POST(request: NextRequest): Promise<NextResponse<AcceptInviteResponse>> {
  try {
    const body: AcceptInviteRequest = await request.json()
    const { token, password } = body

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Missing invite token' },
        { status: 400 }
      )
    }

    // 1. Look up the invite token — hash incoming token before DB lookup
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

    // 2. Check if token is expired
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

    // 3. Check if already accepted
    if (invite.status === 'accepted') {
      return NextResponse.json(
        { success: false, error: 'This invite has already been accepted' },
        { status: 409 }
      )
    }

    // 4. Check if already has an agent_id
    if (invite.agent_id) {
      return NextResponse.json(
        { success: false, error: 'This invite has already been processed' },
        { status: 409 }
      )
    }

    // 5. Parse name into first/last
    const names = (invite.name || '').trim().split(' ')
    const firstName = names[0] || 'Agent'
    const lastName = names.slice(1).join(' ') || ''

    // 6. Generate or use provided password
    let passwordHash: string
    if (password) {
      if (password.length < 8) {
        return NextResponse.json(
          { success: false, error: 'Password must be at least 8 characters' },
          { status: 400 }
        )
      }
      passwordHash = await bcrypt.hash(password, 10)
    } else {
      const tempPassword = crypto.randomBytes(12).toString('hex')
      passwordHash = await bcrypt.hash(tempPassword, 10)
    }

    // 7. Create the real_estate_agents record
    const { data: newAgent, error: createAgentError } = await supabase
      .from('real_estate_agents')
      .insert({
        email: invite.email.toLowerCase(),
        first_name: firstName,
        last_name: lastName,
        password_hash: passwordHash,
        source: 'pilot_invite',
        status: 'onboarding',
        email_verified: true,
        trial_start_date: new Date().toISOString(),
        trial_expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
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

    const agentId = newAgent.id

    // 8. Update the invite record with agent_id and accepted status
    const { error: updateInviteError } = await supabase
      .from('pilot_invites')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        agent_id: agentId
      })
      .eq('id', invite.id)

    if (updateInviteError) {
      logger.error('Error updating invite:', updateInviteError)
      return NextResponse.json(
        { success: false, error: 'Failed to accept invite' },
        { status: 500 }
      )
    }

    // 9. Create pilot_progress record for admin tracking (non-blocking)
    void Promise.resolve(supabase.from('pilot_progress').insert({
      agent_id: agentId,
      stage: 'signed_up',
      stage_entered_at: new Date().toISOString(),
      pilot_cohort: 'cohort-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })).catch((err: unknown) => {
      logger.error('[accept-invite] Failed to create pilot_progress record:', err)
    })

    // Return success
    return NextResponse.json(
      {
        success: true,
        agentId
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
