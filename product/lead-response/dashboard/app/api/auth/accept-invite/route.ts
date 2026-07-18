import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { postgrestAdmin } from '@/lib/db'
import { logger } from '@/lib/logger'
import { createSession } from '@/lib/services/AuthService'

interface AcceptInviteRequest {
  token: string
}

interface AcceptInviteResponse {
  success: boolean
  agentId?: string
  email?: string
  name?: string
  needsPassword?: boolean
  redirectTo?: string
  error?: string
}

const supabase = postgrestAdmin
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const TRIAL_ACTIVATION_PURPOSE = 'trial-activation'
const TRIAL_ACTIVATION_ISSUER = 'leadflow-admin-magic-link'
const DASHBOARD_REDIRECT = '/dashboard/onboarding'
const AUTH_COOKIE_DAYS = 14
const SESSION_COOKIE_DAYS = 30
const HOURS_PER_DAY = 24
const MINUTES_PER_HOUR = 60
const SECONDS_PER_MINUTE = 60

interface TrialActivationPayload {
  agentId?: string
  email?: string
  purpose?: string
  iss?: string
}

function isJwtLike(token: string): boolean {
  return token.split('.').length === 3
}

function getClientIp(request: NextRequest): string | undefined {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || undefined
}

async function acceptTrialActivationToken(
  request: NextRequest,
  token: string
): Promise<NextResponse<AcceptInviteResponse>> {
  let payload: TrialActivationPayload

  try {
    payload = jwt.verify(token, JWT_SECRET, { issuer: TRIAL_ACTIVATION_ISSUER }) as TrialActivationPayload
  } catch (err: any) {
    const message = err?.name === 'TokenExpiredError'
      ? 'This magic link has expired. Please request a new one.'
      : 'Invalid magic link'
    return NextResponse.json(
      { success: false, error: message },
      { status: 401 }
    )
  }

  if (payload.purpose !== TRIAL_ACTIVATION_PURPOSE || !payload.agentId || !payload.email) {
    return NextResponse.json(
      { success: false, error: 'Invalid magic link' },
      { status: 401 }
    )
  }

  const { data: agent, error: agentError } = await supabase
    .from('real_estate_agents')
    .select('id, email, first_name, last_name')
    .eq('id', payload.agentId)
    .single()

  if (agentError || !agent || agent.email.toLowerCase() !== payload.email.toLowerCase()) {
    return NextResponse.json(
      { success: false, error: 'Invalid magic link' },
      { status: 401 }
    )
  }

  await supabase
    .from('real_estate_agents')
    .update({
      email_verified: true,
      status: 'onboarding',
      updated_at: new Date().toISOString()
    })
    .eq('id', agent.id)

  const session = await createSession({
    userId: agent.id,
    userAgent: request.headers.get('user-agent') || undefined,
    ipAddress: getClientIp(request),
    rememberMe: true,
  })

  const authToken = jwt.sign(
    {
      userId: agent.id,
      email: agent.email,
      name: `${agent.first_name || ''} ${agent.last_name || ''}`.trim()
    },
    JWT_SECRET,
    { expiresIn: `${AUTH_COOKIE_DAYS}d` }
  )

  const response = NextResponse.json(
    {
      success: true,
      agentId: agent.id,
      email: agent.email,
      name: `${agent.first_name || ''} ${agent.last_name || ''}`.trim(),
      needsPassword: false,
      redirectTo: DASHBOARD_REDIRECT,
    },
    { status: 200 }
  )

  response.cookies.set('auth-token', authToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: AUTH_COOKIE_DAYS * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE,
    path: '/'
  })

  response.cookies.set({
    name: 'leadflow_session',
    value: session.token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SESSION_COOKIE_DAYS * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE,
    path: '/'
  })

  return response
}

/**
 * POST /api/auth/accept-invite
 *
 * Validate a pilot invite token or an admin trial-activation JWT.
 * Pilot invites still use /api/auth/set-password; trial-activation JWTs create
 * an immediate session for manual Gmail outreach while automated email is down.
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

    if (isJwtLike(token)) {
      return acceptTrialActivationToken(request, token)
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
