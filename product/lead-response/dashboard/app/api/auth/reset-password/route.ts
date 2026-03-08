/**
 * POST /api/auth/reset-password
 * UC: fix-no-forgot-password-flow — FR-4
 *
 * Validates reset token, updates password_hash, marks token used.
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { supabaseServer as supabase, isSupabaseConfigured } from '@/lib/supabase-server'

const BCRYPT_ROUNDS = 12

/** Hash a raw token with SHA-256 (must match forgot-password route) */
function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { token, password, confirmPassword } = body || {}

    // Validate inputs
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Invalid or missing token' }, { status: 400 })
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 })
    }

    // Look up token by hash
    const tokenHash = hashToken(token)
    const now = new Date().toISOString()

    const { data: resetToken, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('id, agent_id, expires_at, used')
      .eq('token_hash', tokenHash)
      .single()

    if (tokenError || !resetToken) {
      return NextResponse.json(
        { error: 'This reset link is invalid or has expired.' },
        { status: 400 }
      )
    }

    if (resetToken.used) {
      return NextResponse.json(
        { error: 'This reset link has already been used.' },
        { status: 400 }
      )
    }

    if (resetToken.expires_at < now) {
      return NextResponse.json(
        { error: 'This reset link has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)

    // Update agent's password_hash
    const { error: updateError } = await supabase
      .from('real_estate_agents')
      .update({ password_hash: passwordHash })
      .eq('id', resetToken.agent_id)

    if (updateError) {
      console.error('[reset-password] Failed to update password_hash:', updateError)
      return NextResponse.json(
        { error: 'Failed to update password. Please try again.' },
        { status: 500 }
      )
    }

    // Mark token as used (single-use enforcement)
    await supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('id', resetToken.id)

    console.log(`[reset-password] Password reset successful for agent ${resetToken.agent_id}`)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[reset-password] Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
