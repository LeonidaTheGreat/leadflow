/**
 * POST /api/auth/forgot-password
 * UC: fix-no-forgot-password-flow
 *
 * Accepts an email address, generates a secure reset token, stores its hash
 * in `password_reset_tokens`, and sends the reset email via Resend.
 * Always returns 200 (anti-enumeration — never reveals whether the email exists).
 *
 * DB schema for password_reset_tokens:
 *   id          uuid (PK)
 *   agent_id    uuid (FK → real_estate_agents.id)
 *   token_hash  text  (SHA-256 of raw token)
 *   expires_at  timestamptz
 *   used        boolean (default false)
 *   created_at  timestamptz
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import crypto from 'crypto'
import { sendPasswordResetEmail } from '@/lib/email-service'

const supabase = supabaseAdmin

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://dashboard-three-orcin-75.vercel.app'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      // Return 200 to prevent enumeration even for bad payloads
      return NextResponse.json({ success: true })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Look up the agent — but always return 200 regardless
    const { data: agent } = await supabase
      .from('real_estate_agents')
      .select('id, email, first_name')
      .eq('email', normalizedEmail)
      .single()

    if (agent) {
      // Generate a cryptographically secure 32-byte random token
      const rawToken = crypto.randomBytes(32).toString('hex')

      // SHA-256 hash of the raw token to store in DB (never store raw token)
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')

      const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now

      // Invalidate any existing unexpired, unused tokens for this agent
      await supabase
        .from('password_reset_tokens')
        .update({ used: true })
        .eq('agent_id', agent.id)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())

      // Insert new token using correct schema columns
      const { error: insertError } = await supabase
        .from('password_reset_tokens')
        .insert({
          agent_id: agent.id,
          token_hash: tokenHash,
          expires_at: expiresAt.toISOString(),
        })

      if (insertError) {
        console.error('Failed to insert reset token:', insertError.message)
        // Still return 200 — don't expose DB errors
        return NextResponse.json({ success: true })
      }

      // Build the reset URL with the RAW token (not the hash)
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dashboard-three-orcin-75.vercel.app'
      const resetUrl = `${appUrl}/reset-password?token=${rawToken}`

      // Send the reset email
      const agentName = agent.first_name || undefined
      await sendPasswordResetEmail(agent.email, agent.id, {
        agentName,
        resetUrl,
      })
    }

    // Always return 200 (anti-enumeration)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Forgot password error:', error)
    // Return 200 even on unexpected errors (anti-enumeration)
    return NextResponse.json({ success: true })
  }
}
