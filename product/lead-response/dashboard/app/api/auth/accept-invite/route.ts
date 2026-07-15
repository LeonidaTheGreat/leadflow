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

const TRIAL_DAYS = 14

/**
 * POST /api/auth/accept-invite
 *
 * Accept a pilot invite via magic token.
 *
 * Two flows are supported:
 *
 * A) Pre-provisioned agent (admin invite-pilot / pilot-targets invite):
 *    The invite record already has agent_id set (agent was created at invite time
 *    with a placeholder password 'invited'). On acceptance we set a real password
 *    and transition the existing agent to 'onboarding'.
 *
 * B) New agent (pilot-signups invite, no agent_id on invite):
 *    We create a fresh agent record on acceptance.
 *
 * In both cases we mark the invite as 'accepted' and create a pilot_progress record.
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

    // 4. Validate and hash password
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

    const trialExpiresAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString()

    let agentId: string

    if (invite.agent_id) {
      // Flow A: Pre-provisioned agent — admin created the agent at invite time
      // with a placeholder password. Update with real credentials and onboarding state.
      agentId = invite.agent_id

      const { error: updateAgentError } = await supabase
        .from('real_estate_agents')
        .update({
          password_hash: passwordHash,
          status: 'onboarding',
          email_verified: true,
          pilot_started_at: now.toISOString(),
          pilot_expires_at: trialExpiresAt,
          updated_at: now.toISOString()
        })
        .eq('id', agentId)

      if (updateAgentError) {
        logger.error('Error updating pre-provisioned agent:', updateAgentError)
        return NextResponse.json(
          { success: false, error: 'Failed to activate agent account' },
          { status: 500 }
        )
      }
    } else {
      // Flow B: No pre-provisioned agent — create a fresh account now.
      const names = (invite.name || '').trim().split(' ')
      const firstName = names[0] || 'Agent'
      const lastName = names.slice(1).join(' ') || ''

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
          pilot_started_at: now.toISOString(),
          pilot_expires_at: trialExpiresAt,
          created_at: now.toISOString(),
          updated_at: now.toISOString()
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
    }

    // 5. Mark the invite as accepted
    const { error: updateInviteError } = await supabase
      .from('pilot_invites')
      .update({
        status: 'accepted',
        accepted_at: now.toISOString(),
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

    // 6. Create pilot_progress record (non-blocking)
    void Promise.resolve(supabase.from('pilot_progress').insert({
      agent_id: agentId,
      stage: 'signed_up',
      stage_entered_at: now.toISOString(),
      pilot_cohort: 'cohort-1',
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    })).catch((err: unknown) => {
      logger.error('[accept-invite] Failed to create pilot_progress record:', err)
    })

    return NextResponse.json(
      { success: true, agentId },
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
