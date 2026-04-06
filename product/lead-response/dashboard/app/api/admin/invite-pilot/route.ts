import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'
import { supabaseServer } from '@/lib/supabase-server'
import { sendPilotInviteEmail } from '@/lib/email-service'

function generateInviteToken(): { rawToken: string; tokenHash: string } {
  const rawToken = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')

  return { rawToken, tokenHash }
}

// Admin auth check - verify X-Admin-Token header
function checkAdminAuth(request: NextRequest): boolean {
  const adminToken = request.headers.get('x-admin-token')
  const expectedToken = process.env.ADMIN_SECRET

  if (!expectedToken) {
    console.warn('ADMIN_SECRET not configured in environment')
    return false
  }

  return adminToken === expectedToken
}

interface InviteRequest {
  email?: string
  name?: string
  message?: string
}

interface InviteResponse {
  success: boolean
  agentId?: string
  expiresAt?: string
  emailSent?: boolean
  message?: string
  error?: string
}

/**
 * POST /api/admin/invite-pilot
 *
 * Direct recruitment endpoint for Stojan.
 * Accepts: email (required), name (required), message (optional)
 * Returns: invite metadata + agent ID
 *
 * Auth: X-Admin-Token header (must match ADMIN_SECRET)
 */
export async function POST(request: NextRequest): Promise<NextResponse<InviteResponse>> {
  try {
    // 1. Check admin auth
    if (!checkAdminAuth(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - invalid or missing admin token' },
        { status: 401 }
      )
    }

    // 2. Parse and validate request body
    const body: InviteRequest = await request.json()
    let { email, name, message } = body

    if (!email || !name) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: email and name' },
        { status: 400 }
      )
    }

    // Trim and normalize email
    email = email.toLowerCase().trim()

    // Basic email validation
    if (!email.includes('@') || email.length < 5) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // 3. Check for existing pending invite
    const { data: existingInvite } = await supabaseServer
      .from('pilot_invites')
      .select('*')
      .eq('email', email)
      .eq('status', 'pending')
      .single()

    if (existingInvite) {
      // Check if token is still valid — re-issue a new raw token (raw token is never stored, only hash)
      if (new Date(existingInvite.token_expires_at) > new Date()) {
        const { rawToken, tokenHash } = generateInviteToken()
        await supabaseServer
          .from('pilot_invites')
          .update({ token: tokenHash })
          .eq('id', existingInvite.id)
        // Do NOT return raw token in response — it should never be logged
        return NextResponse.json(
          {
            success: true,
            agentId: existingInvite.agent_id,
            expiresAt: existingInvite.token_expires_at,
            message: 'Existing invite found and token refreshed. Invitation email will be sent.'
          },
          { status: 200 }
        )
      }
    }

    // 4. Create or get agent record
    let agentId: string
    const { data: existingAgent } = await supabaseServer
      .from('real_estate_agents')
      .select('id')
      .eq('email', email)
      .single()

    if (existingAgent) {
      // Agent already exists, just update status if needed
      agentId = existingAgent.id
      await supabaseServer
        .from('real_estate_agents')
        .update({ status: 'invited', plan_tier: 'pilot', email_verified: true })
        .eq('id', agentId)
    } else {
      // Create new agent record
      agentId = uuidv4()
      const { error: createError } = await supabaseServer
        .from('real_estate_agents')
        .insert({
          id: agentId,
          email,
          first_name: name.split(' ')[0] || name,
          last_name: name.split(' ').slice(1).join(' ') || '',
          status: 'invited',
          plan_tier: 'pilot',
          email_verified: true,
          password_hash: 'invited', // Placeholder - will be set on first login
          created_at: new Date().toISOString()
        })

      if (createError && !createError.message.includes('duplicate key')) {
        console.error('Error creating agent:', createError)
        return NextResponse.json(
          { success: false, error: 'Failed to create agent record' },
          { status: 500 }
        )
      }
    }

    // 5. Create pilot invite record — store SHA-256 hash of token, never the raw token
    const { rawToken, tokenHash } = generateInviteToken()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days

    const { error: inviteError } = await supabaseServer
      .from('pilot_invites')
      .insert({
        email,
        name,
        message: message || null,
        token: tokenHash,
        token_expires_at: expiresAt.toISOString(),
        agent_id: agentId,
        status: 'pending'
      })

    if (inviteError) {
      console.error('Error creating invite:', inviteError)
      return NextResponse.json(
        { success: false, error: 'Failed to create invite record' },
        { status: 500 }
      )
    }

    // 6. Send email — use raw token in URL (only hash is stored in DB)
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-five.vercel.app').trim()
    const inviteUrl = `${appUrl}/accept-invite?token=${rawToken}`

    const emailSent = await sendPilotInviteEmail(email, agentId, {
      agentName: name,
      message: message,
      inviteUrl,
      expiresAt: expiresAt.toISOString()
    })

    if (!emailSent) {
      console.warn(`Email sending failed for ${email}, but invite record created. Agent ID: ${agentId}`)
    }

    // 7. Return success response (do NOT return raw token in response — it should never be logged)
    return NextResponse.json(
      {
        success: true,
        agentId,
        expiresAt: expiresAt.toISOString(),
        emailSent
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error in invite-pilot endpoint:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/invite-pilot?action=list
 *
 * Get list of all invites (for admin dashboard).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin auth
    if (!checkAdminAuth(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'list') {
      const { data: invites, error } = await supabaseServer
        .from('pilot_invites')
        .select('*')
        .order('invited_at', { ascending: false })

      if (error) {
        return NextResponse.json(
          { error: 'Failed to fetch invites' },
          { status: 500 }
        )
      }

      return NextResponse.json({ invites })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Error in invite-pilot GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
