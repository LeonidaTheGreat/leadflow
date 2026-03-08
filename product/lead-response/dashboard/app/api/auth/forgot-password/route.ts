/**
 * POST /api/auth/forgot-password
 * UC: fix-no-forgot-password-flow — FR-2
 *
 * Accepts { email } and dispatches a password reset email if the agent exists.
 * Always returns 200 to prevent email enumeration.
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseServer as supabase, isSupabaseConfigured } from '@/lib/supabase-server'
import { sendPasswordResetEmail } from '@/lib/email-service'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-five.vercel.app'

/** Hash a raw token with SHA-256 (hex) for DB storage */
function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true }) // anti-enumeration: always 200
    }

    const body = await request.json()
    const email = (body?.email || '').trim().toLowerCase()

    if (!email) {
      // Return 200 even for missing email (anti-enumeration)
      return NextResponse.json({ success: true })
    }

    // Look up agent by email
    const { data: agent, error: agentError } = await supabase
      .from('real_estate_agents')
      .select('id, email, first_name, last_name')
      .eq('email', email)
      .single()

    // If agent not found, return 200 without sending email (anti-enumeration)
    if (agentError || !agent) {
      console.log(`[forgot-password] No agent found for email: ${email} — returning 200 (anti-enumeration)`)
      return NextResponse.json({ success: true })
    }

    // Generate cryptographically secure random token (32 bytes = 64 hex chars)
    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = hashToken(rawToken)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour

    // Invalidate any previous unexpired tokens for this agent
    await supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('agent_id', agent.id)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())

    // Insert new token (store hash only — never the raw token)
    const { error: insertError } = await supabase
      .from('password_reset_tokens')
      .insert({
        agent_id: agent.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
        used: false,
      })

    if (insertError) {
      console.error('[forgot-password] Failed to insert token:', insertError)
      // Still return 200 to avoid leaking DB errors
      return NextResponse.json({ success: true })
    }

    // Build reset URL with raw token
    const resetUrl = `${APP_URL}/reset-password?token=${rawToken}`

    // Send email
    const agentName = [agent.first_name, agent.last_name].filter(Boolean).join(' ')
    await sendPasswordResetEmail(agent.email, agent.id, {
      agentName: agentName || undefined,
      resetUrl,
    })

    console.log(`[forgot-password] Reset email dispatched to ${email}`)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[forgot-password] Unexpected error:', error)
    // Return 200 even on error (anti-enumeration + don't expose internals)
    return NextResponse.json({ success: true })
  }
}
