/**
 * POST /api/auth/reset-password
 * UC: fix-no-forgot-password-flow
 *
 * Validates the reset token, hashes the new password with bcrypt,
 * updates real_estate_agents.password_hash, and marks the token as used.
 * Returns 400 on invalid/expired tokens.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

const PLACEHOLDER_URL = 'https://placeholder.supabase.co'
const PLACEHOLDER_KEY = 'placeholder'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || PLACEHOLDER_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest) {
  try {
    const { token, password, confirmPassword } = await request.json()

    // Validate input
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'This reset link is invalid or has expired.' },
        { status: 400 }
      )
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Password is required.' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters.' },
        { status: 400 }
      )
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match.' },
        { status: 400 }
      )
    }

    // Hash the incoming raw token the same way we stored it
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    // Look up the token in DB
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

    // Check used
    if (resetToken.used) {
      return NextResponse.json(
        { error: 'This reset link has already been used.' },
        { status: 400 }
      )
    }

    // Check expiry
    if (new Date(resetToken.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This reset link has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    // Hash new password (12 rounds)
    const passwordHash = await bcrypt.hash(password, 12)

    // Update password in real_estate_agents
    const { error: updateError } = await supabase
      .from('real_estate_agents')
      .update({
        password_hash: passwordHash,
        updated_at: new Date().toISOString(),
      })
      .eq('id', resetToken.agent_id)

    if (updateError) {
      console.error('Failed to update password:', updateError.message)
      return NextResponse.json(
        { error: 'Failed to update password. Please try again.' },
        { status: 500 }
      )
    }

    // Mark token as used
    await supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('id', resetToken.id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
