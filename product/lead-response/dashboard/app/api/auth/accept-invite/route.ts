import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { postgrestAdmin } from '@/lib/db'
import { createSession } from '@/lib/services/AuthService'
import { logger } from '@/lib/logger'

interface AcceptInviteRequest {
  token: string
  password?: string
}

interface AcceptInviteResponse {
  success: boolean
  agentId?: string
  token?: string
  user?: {
    id: string
    email: string
    firstName: string
    lastName: string
    onboardingCompleted: boolean
  }
  error?: string
}

const supabase = postgrestAdmin

/**
 * POST /api/auth/accept-invite
 *
 * Accept a pilot invite via magic token.
 * This endpoint:
 * 1. Validates the token exists, is not expired, and status is 'pending' (not 'accepted')
 * 2. Creates a new real_estate_agent account (email, name from invite)
 * 3. Generates random password if not provided by the user
 * 4. Updates the invite as accepted with agent_id
 * 5. Creates a pilot_progress record
 * 6. If the user set an explicit password, creates a session for immediate login
 *
 * Returns: { success: true, agentId, token?, user? } or error
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
    // IMPORTANT: The column is trial_ends_at (not trial_expires_at).
    // PostgREST silently ignores unknown columns, so trial_expires_at would set nothing.
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
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id, email, first_name, last_name')
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

    // 10. If the user explicitly set a password, create a session so they're immediately logged in.
    // If we generated a random password (no password in request body), skip session creation —
    // the user will need to use forgot-password to set their own password before logging in.
    if (password) {
      try {
        const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
          ?? request.headers.get('x-real-ip')
          ?? undefined
        const session = await createSession({
          userId: agentId,
          userAgent: request.headers.get('user-agent') || undefined,
          ipAddress,
          rememberMe: true, // Pilot users get 30-day session
        })

        const response = NextResponse.json(
          {
            success: true,
            agentId,
            token: session.token,
            user: {
              id: agentId,
              email: newAgent.email,
              firstName: newAgent.first_name,
              lastName: newAgent.last_name,
              onboardingCompleted: false
            }
          },
          { status: 200 }
        )

        // Set HTTP-only session cookie — same config as /api/auth/login
        response.cookies.set({
          name: 'leadflow_session',
          value: session.token,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 30 * 24 * 60 * 60, // 30 days
          path: '/',
        })

        return response
      } catch (sessionError) {
        // Session creation failure must not block account creation — log and fall through
        logger.error('[accept-invite] Session creation failed:', sessionError)
      }
    }

    // Return success without session (random-password case or session creation failure)
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
