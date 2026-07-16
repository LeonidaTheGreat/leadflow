import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { postgrestAdmin } from '@/lib/db'
import { logger } from '@/lib/logger'

interface SetPasswordRequest {
  token: string
  password: string
}

interface SetPasswordResponse {
  success: boolean
  agentId?: string
  error?: string
}

const supabase = postgrestAdmin

/**
 * POST /api/auth/set-password
 *
 * Final step of the invite-accept flow.
 * Validates the invite token, sets the agent's password, marks the invite
 * accepted, and activates the agent account so they can log in.
 *
 * The invite-pilot route pre-creates a real_estate_agents row with
 * password_hash='invited' and agent_id already set on the invite. This
 * endpoint updates that existing row instead of creating a duplicate.
 *
 * Returns 200 + { agentId } on success
 * Returns 400 on missing/short password
 * Returns 404 on invalid token
 * Returns 409 if already accepted
 * Returns 410 if expired
 */
export async function POST(request: NextRequest): Promise<NextResponse<SetPasswordResponse>> {
  try {
    const body: SetPasswordRequest = await request.json()
    const { token, password } = body

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Missing invite token' },
        { status: 400 }
      )
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Hash the raw token before DB lookup — only hashes are stored
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

    // Already accepted
    if (invite.accepted_at) {
      return NextResponse.json(
        { success: false, error: 'This invite has already been accepted' },
        { status: 409 }
      )
    }

    // Expired
    if (new Date(invite.token_expires_at) < new Date()) {
      await supabase
        .from('pilot_invites')
        .update({ status: 'expired' })
        .eq('id', invite.id)

      return NextResponse.json(
        { success: false, error: 'This invite has expired. Please request a new one.' },
        { status: 410 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const now = new Date().toISOString()
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

    // Parse name for potential new-agent creation
    const names = (invite.name || '').trim().split(' ')
    const firstName = names[0] || 'Agent'
    const lastName = names.slice(1).join(' ') || ''

    let agentId: string

    if (invite.agent_id) {
      // Agent was pre-created by invite-pilot with password_hash='invited'.
      // Update the existing record — do not create a duplicate.
      agentId = invite.agent_id
      const { error: updateError } = await supabase
        .from('real_estate_agents')
        .update({
          password_hash: passwordHash,
          status: 'onboarding',
          email_verified: true,
          trial_start_date: now,
          trial_ends_at: trialEndsAt,
          updated_at: now,
        })
        .eq('id', agentId)

      if (updateError) {
        logger.error('[set-password] Failed to update agent:', updateError)
        return NextResponse.json(
          { success: false, error: 'Failed to activate agent account' },
          { status: 500 }
        )
      }
    } else {
      // No pre-created agent — create one now (fallback for older invite records)
      agentId = uuidv4()
      const { error: createError } = await supabase
        .from('real_estate_agents')
        .insert({
          id: agentId,
          email: invite.email.toLowerCase(),
          first_name: firstName,
          last_name: lastName,
          password_hash: passwordHash,
          source: 'pilot_invite',
          status: 'onboarding',
          email_verified: true,
          trial_start_date: now,
          trial_ends_at: trialEndsAt,
          created_at: now,
          updated_at: now,
        })

      if (createError) {
        logger.error('[set-password] Failed to create agent:', createError)
        return NextResponse.json(
          { success: false, error: 'Failed to create agent account' },
          { status: 500 }
        )
      }
    }

    // Mark invite as accepted
    const { error: inviteUpdateError } = await supabase
      .from('pilot_invites')
      .update({
        status: 'accepted',
        accepted_at: now,
        agent_id: agentId,
      })
      .eq('id', invite.id)

    if (inviteUpdateError) {
      logger.error('[set-password] Failed to mark invite accepted:', inviteUpdateError)
      return NextResponse.json(
        { success: false, error: 'Failed to complete invite acceptance' },
        { status: 500 }
      )
    }

    // Create pilot_progress record (non-blocking)
    void Promise.resolve(
      supabase.from('pilot_progress').insert({
        agent_id: agentId,
        stage: 'signed_up',
        stage_entered_at: now,
        pilot_cohort: 'cohort-1',
        created_at: now,
        updated_at: now,
      })
    ).catch((err: unknown) => {
      logger.error('[set-password] Failed to create pilot_progress record:', err)
    })

    return NextResponse.json({ success: true, agentId }, { status: 200 })
  } catch (error: unknown) {
    logger.error('Error in set-password endpoint:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
