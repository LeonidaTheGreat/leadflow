import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'
import { postgrestAdmin } from '@/lib/db'
import { sendPilotInviteEmail } from '@/lib/email-service'
import { logger } from '@/lib/logger'
import { requireAdminSession } from '@/lib/admin-auth'

function generateInviteToken(): { rawToken: string; tokenHash: string } {
  const rawToken = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')

  return { rawToken, tokenHash }
}

/**
 * POST /api/admin/pilot-targets/[id]/invite
 *
 * Send a pilot invite to a recruitment target and mark them as "contacted".
 * Requires target to have an email address.
 *
 * Auth: admin_session httpOnly cookie (set via /api/admin/login).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    if (!(await requireAdminSession(request))) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // 1. Fetch the target
    const { data: target, error: targetError } = await postgrestAdmin
      .from('pilot_recruitment_targets')
      .select('*')
      .eq('id', id)
      .single()

    if (targetError || !target) {
      return NextResponse.json({ success: false, error: 'Target not found' }, { status: 404 })
    }

    if (!target.email) {
      return NextResponse.json(
        { success: false, error: 'Target has no email address — add one before sending an invite' },
        { status: 400 }
      )
    }

    const email = (target.email as string).toLowerCase().trim()
    const name = target.name as string

    // 2. Check for existing pending invite
    const { data: existingInvite } = await postgrestAdmin
      .from('pilot_invites')
      .select('*')
      .eq('email', email)
      .eq('status', 'pending')
      .maybeSingle()

    if (existingInvite && new Date((existingInvite as any).token_expires_at) > new Date()) {
      // Refresh the token and resend
      const { rawToken, tokenHash } = generateInviteToken()
      await postgrestAdmin
        .from('pilot_invites')
        .update({ token: tokenHash })
        .eq('id', (existingInvite as any).id)

      const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-five.vercel.app').trim()
      const inviteUrl = `${appUrl}/accept-invite?token=${rawToken}`

      const emailSent = await sendPilotInviteEmail(email, (existingInvite as any).agent_id, {
        agentName: name,
        inviteUrl,
        expiresAt: (existingInvite as any).token_expires_at })

      // Mark target as contacted
      await postgrestAdmin
        .from('pilot_recruitment_targets')
        .update({ status: 'contacted' })
        .eq('id', id)

      return NextResponse.json({
        success: true,
        agentId: (existingInvite as any).agent_id,
        expiresAt: (existingInvite as any).token_expires_at,
        emailSent,
        note: 'Existing invite refreshed and resent' })
    }

    // 3. Create or get agent record
    let agentId: string
    const { data: existingAgent } = await postgrestAdmin
      .from('real_estate_agents')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingAgent) {
      agentId = (existingAgent as any).id
      await postgrestAdmin
        .from('real_estate_agents')
        .update({ status: 'invited', plan_tier: 'pilot', email_verified: true })
        .eq('id', agentId)
    } else {
      agentId = uuidv4()
      const nameParts = name.split(' ')
      const { error: createError } = await postgrestAdmin
        .from('real_estate_agents')
        .insert({
          id: agentId,
          email,
          first_name: nameParts[0] || name,
          last_name: nameParts.slice(1).join(' ') || '',
          status: 'invited',
          plan_tier: 'pilot',
          email_verified: true,
          password_hash: 'invited',
          created_at: new Date().toISOString() })

      if (createError && !createError.message?.includes('duplicate key')) {
        logger.error('Error creating agent:', createError)
        return NextResponse.json({ success: false, error: 'Failed to create agent record' }, { status: 500 })
      }
    }

    // 4. Create invite record
    const { rawToken, tokenHash } = generateInviteToken()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const { error: inviteError } = await postgrestAdmin
      .from('pilot_invites')
      .insert({
        email,
        name,
        token: tokenHash,
        token_expires_at: expiresAt.toISOString(),
        agent_id: agentId,
        status: 'pending' })

    if (inviteError) {
      logger.error('Error creating invite:', inviteError)
      return NextResponse.json({ success: false, error: 'Failed to create invite' }, { status: 500 })
    }

    // 5. Send email
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-five.vercel.app').trim()
    const inviteUrl = `${appUrl}/accept-invite?token=${rawToken}`

    const emailSent = await sendPilotInviteEmail(email, agentId, {
      agentName: name,
      inviteUrl,
      expiresAt: expiresAt.toISOString() })

    if (!emailSent) {
      logger.warn(`Email sending failed for ${email}, invite record created. Agent: ${agentId}`)
    }

    // 6. Mark target as contacted
    await postgrestAdmin
      .from('pilot_recruitment_targets')
      .update({ status: 'contacted' })
      .eq('id', id)

    return NextResponse.json({
      success: true,
      agentId,
      expiresAt: expiresAt.toISOString(),
      emailSent })
  } catch (error: any) {
    logger.error('Error in target invite endpoint:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
