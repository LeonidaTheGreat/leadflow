import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
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
 * Set password for a pilot invite agent. Called after accept-invite validates the token.
 * Sets password_hash, activates the agent, marks invite as accepted.
 */
export async function POST(request: NextRequest): Promise<NextResponse<SetPasswordResponse>> {
  try {
    const body: SetPasswordRequest = await request.json()
    const { token, password } = body

    if (!token || !password) {
      return NextResponse.json(
        { success: false, error: 'Missing token or password' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
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
        { success: false, error: 'Invalid invite token' },
        { status: 404 }
      )
    }

    if (invite.accepted_at || invite.status === 'accepted') {
      return NextResponse.json(
        { success: false, error: 'This invite has already been accepted' },
        { status: 409 }
      )
    }

    const expiresAt = new Date(invite.token_expires_at)
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: 'This invite has expired' },
        { status: 410 }
      )
    }

    if (!invite.agent_id) {
      return NextResponse.json(
        { success: false, error: 'Invite has not been validated yet. Call accept-invite first.' },
        { status: 400 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const { error: updateAgentError } = await supabase
      .from('real_estate_agents')
      .update({
        password_hash: passwordHash,
        status: 'onboarding',
        trial_start_date: new Date().toISOString(),
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', invite.agent_id)

    if (updateAgentError) {
      logger.error('Error updating agent password:', updateAgentError)
      return NextResponse.json(
        { success: false, error: 'Failed to set password' },
        { status: 500 }
      )
    }

    const { error: updateInviteError } = await supabase
      .from('pilot_invites')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', invite.id)

    if (updateInviteError) {
      logger.error('Error marking invite accepted:', updateInviteError)
    }

    void Promise.resolve(supabase.from('pilot_progress').insert({
      agent_id: invite.agent_id,
      stage: 'signed_up',
      stage_entered_at: new Date().toISOString(),
      pilot_cohort: 'cohort-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })).catch((err: unknown) => {
      logger.error('[set-password] Failed to create pilot_progress record:', err)
    })

    return NextResponse.json(
      { success: true, agentId: invite.agent_id },
      { status: 200 }
    )
  } catch (error: any) {
    logger.error('Error in set-password endpoint:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
