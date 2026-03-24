import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { createSession } from '@/lib/session'
import { logSessionStart } from '@/lib/session-analytics'

const supabase = createClient(
  (process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!,
  (process.env.API_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!
)

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

    // Create server-side session
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? request.headers.get('x-real-ip') 
      ?? undefined
    const session = await createSession({
      userId: user.id,
      userAgent: request.headers.get('user-agent') || undefined,
      ipAddress,
      rememberMe,
    })

    // Update last login timestamp
    await supabase
      .from('real_estate_agents')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id)

    // Log session analytics (fail silently — must not break login)
    const analyticsSessionId = await logSessionStart(user.id, ipAddress, request.headers.get('user-agent') || null)

    // Create response with user data and onboarding status
    const response = NextResponse.json({
      success: true,
      token: session.token,
      analyticsSessionId,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        // onboardingCompleted drives the post-login wizard redirect
        onboardingCompleted: user.onboarding_completed ?? false,
      }
    })

    // Set HTTP-only cookie with session token
    const cookieMaxAge = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60 // 30 days or 24 hours
    response.cookies.set({
      name: 'leadflow_session',
      value: session.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: cookieMaxAge,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
