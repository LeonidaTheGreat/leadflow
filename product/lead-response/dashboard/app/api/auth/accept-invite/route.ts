import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { postgrestAdmin } from '@/lib/db'
import { logger } from '@/lib/logger'

interface AcceptInviteRequest {
  token: string
}

interface AcceptInviteResponse {
  success: boolean
  agentName?: string
  email?: string
  agentId?: string
  error?: string
}

const supabase = postgrestAdmin

/**
 * POST /api/auth/accept-invite
 *
 * Validates a pilot invite token and returns the invite details so the UI can
 * show a "Set your password" form. Does NOT mutate any DB rows — that is done
 * by POST /api/auth/set-password after the user submits their chosen password.
 *
 * Returns 200 + { agentName, email } on valid pending invite
 * Returns 404 on invalid/unknown token
 * Returns 409 if already accepted (accepted_at IS NOT NULL)
 * Returns 410 if expired
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

    // Already accepted — check accepted_at (the authoritative completion marker)
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

    return NextResponse.json(
      {
        success: true,
        agentName: invite.name,
        email: invite.email,
        agentId: invite.agent_id || undefined,
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    logger.error('Error in accept-invite endpoint:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
