import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { logSessionStart } from '@/lib/agent-session'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export async function POST(request: NextRequest) {
  try {
    const { email, password, rememberMe } = await request.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user by email (include onboarding state for post-login redirect)
    const { data: user, error: userError } = await supabase
      .from('real_estate_agents')
      .select('id, email, password_hash, first_name, last_name, email_verified, onboarding_completed')
      .eq('email', email.toLowerCase())
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Check if email is verified
    if (!user.email_verified) {
      return NextResponse.json(
        { 
          error: 'EMAIL_NOT_VERIFIED', 
          message: 'Please confirm your email address.',
          resendUrl: '/api/auth/resend-verification'
        },
        { status: 403 }
      )
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash)

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Update last login timestamp
    await supabase
      .from('real_estate_agents')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id)

    // Log session start — inserts into agent_sessions (FR-1)
    // Failures are handled gracefully inside logSessionStart; login continues even on error
    const agentSession = await logSessionStart(user.id, request)
    const sessionId = agentSession?.id ?? null

    // Generate JWT token (include session_id claim when available)
    const tokenExpiry = rememberMe ? '30d' : '24h'
    const jwtPayload: Record<string, unknown> = {
      userId: user.id,
      email: user.email,
    }
    if (sessionId) {
      jwtPayload.sessionId = sessionId
    }
    const token = jwt.sign(jwtPayload, JWT_SECRET, { expiresIn: tokenExpiry })

    return NextResponse.json({
      success: true,
      token,
      sessionId,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        // onboardingCompleted drives the post-login wizard redirect
        onboardingCompleted: user.onboarding_completed ?? false,
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
