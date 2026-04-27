import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { postgrestAdmin } from '@/lib/db'
import { logger } from '@/lib/logger'
import { requirePrivilegedRouteAuth } from '@/lib/security/privileged-route-auth'

const supabase = postgrestAdmin

const FROM_EMAIL = (process.env.FROM_EMAIL || 'onboarding@leadflow.ai').trim()
const FRONTEND_URL = process.env.NEXT_PUBLIC_URL || 'https://leadflow-ai-five.vercel.app'
const INVITE_EXPIRY_DAYS = 7

/**
 * GET /api/admin/pilot-signups/invite?action=list-pending
 * List all pending pilot signups (without invites)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const unauthorized = await requirePrivilegedRouteAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'list-pending') {
      // Get all pilot signups without existing invites
      const { data: signups, error: signupError } = await supabase
        .from('pilot_signups')
        .select('*')
        .order('created_at', { ascending: false })

      if (signupError) {
        logger.error('Error fetching signups:', signupError)
        return NextResponse.json(
          { error: 'Failed to fetch signups' },
          { status: 500 }
        )
      }

      // Get all emails that already have invites
      const { data: invites, error: inviteError } = await supabase
        .from('pilot_invites')
        .select('email')

      if (inviteError) {
        logger.error('Error fetching invites:', inviteError)
      }

      const invitedEmails = new Set(invites?.map(i => i.email) || [])
      const pending = signups?.filter(s => !invitedEmails.has(s.email)) || []

      return NextResponse.json({ pending, count: pending.length })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    logger.error('Error in GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/pilot-signups/invite
 * Send invite email to a specific pilot signup
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const unauthorized = await requirePrivilegedRouteAuth(request)
  if (unauthorized) return unauthorized

  try {
    const body = await request.json()
    const { email, name } = body

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      )
    }

    // Check if invite already exists
    const { data: existingInvite, error: checkError } = await supabase
      .from('pilot_invites')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (!checkError && existingInvite) {
      return NextResponse.json(
        { error: 'Invite already sent to this email' },
        { status: 409 }
      )
    }

    // Generate token
    const rawToken = crypto.randomUUID()
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

    // Create invite
    const { data: invite, error: createError } = await supabase
      .from('pilot_invites')
      .insert({
        email: email.toLowerCase(),
        name,
        token: tokenHash,
        token_expires_at: expiresAt.toISOString(),
        status: 'invited',
        invited_by: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (createError || !invite) {
      logger.error('Error creating invite:', createError)
      return NextResponse.json(
        { error: 'Failed to create invite' },
        { status: 500 }
      )
    }

    // Send email
    const acceptUrl = `${FRONTEND_URL}/accept-invite?token=${rawToken}`
    const firstName = name?.split(' ')[0] || 'there'

    const RESEND_API_KEY = (process.env.RESEND_API_KEY || '').trim()
    let emailSent = false

    if (RESEND_API_KEY) {
      try {
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LeadFlow AI Pilot Invitation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #10b981;">🎉 You're Invited!</h1>
  <p>Hi ${firstName},</p>
  <p>Thanks for your interest in LeadFlow AI! We're excited to invite you to join our exclusive pilot program.</p>
  <p><strong>Here's what you get:</strong></p>
  <ul>
    <li>14 days of free access (no credit card required)</li>
    <li>AI-powered lead response in under 30 seconds</li>
    <li>Direct integration with your Follow Up Boss CRM</li>
    <li>Priority support from our team</li>
  </ul>
  <p><a href="${acceptUrl}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Accept Invitation →</a></p>
  <p style="font-size: 12px; color: #666;">This invitation expires in ${INVITE_EXPIRY_DAYS} days.</p>
</body>
</html>
        `

        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from: `LeadFlow AI <${FROM_EMAIL}>`,
            to: email.toLowerCase(),
            subject: `${firstName}, you're invited to try LeadFlow AI for free!`,
            html: emailHtml
          })
        })

        if (response.ok) {
          emailSent = true
          logger.info(`Email sent to ${email}`)
        } else {
          const errorText = await response.text()
          logger.error(`Failed to send email: ${errorText}`)
        }
      } catch (error) {
        logger.error('Error sending email:', error)
      }
    }

    return NextResponse.json({
      success: true,
      inviteId: invite.id,
      emailSent,
      expiresAt: expiresAt.toISOString()
    })
  } catch (error) {
    logger.error('Error in POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
