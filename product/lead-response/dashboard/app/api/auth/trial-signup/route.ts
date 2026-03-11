import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { createSession } from '@/lib/session'
import { sendWelcomeEmail } from '@/lib/email-service'
import { initializeSurveySchedule } from '@/lib/nps-service'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, utm_source, utm_medium, utm_campaign } = await request.json()

    // Validate required fields (only email + password required for frictionless trial)
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Check if account already exists
    const { data: existingAgent } = await supabase
      .from('real_estate_agents')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existingAgent) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Sign in instead.' },
        { status: 409 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Parse optional name
    const nameParts = (name || '').trim().split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    // Calculate trial dates (14 days per PRD-FRICTIONLESS-ONBOARDING-001)
    const now = new Date()
    const trialStartAt = now.toISOString()
    const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()

    // Create agent record with trial tier.
    // email_verified = true: trial users get immediate dashboard access — frictionless onboarding
    // requirement (FR-2/FR-3). A verification email is still sent non-blocking so they can
    // confirm their address later.
    const { data: agent, error: createError } = await supabase
      .from('real_estate_agents')
      .insert({
        email: email.toLowerCase(),
        first_name: firstName,
        last_name: lastName,
        password_hash: passwordHash,
        email_verified: true, // Immediate access — no verification gate for trial users
        plan_tier: 'trial',
        trial_start_at: trialStartAt,
        trial_ends_at: trialEndsAt,
        mrr: 0,
        source: 'trial_cta',
        utm_source: utm_source || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
        onboarding_completed: false,
        created_at: trialStartAt,
        updated_at: trialStartAt,
      })
      .select('id, email, first_name, last_name')
      .single()

    if (createError) {
      console.error('Error creating trial agent:', createError)

      // Graceful fallback: if trial_start_at column doesn't exist yet, retry without it
      if (createError.message?.includes('trial_start_at')) {
        const { data: agentFallback, error: fallbackError } = await supabase
          .from('real_estate_agents')
          .insert({
            email: email.toLowerCase(),
            first_name: firstName,
            last_name: lastName,
            password_hash: passwordHash,
            email_verified: true,
            plan_tier: 'trial',
            trial_ends_at: trialEndsAt,
            mrr: 0,
            source: 'trial_cta',
            utm_source: utm_source || null,
            utm_medium: utm_medium || null,
            utm_campaign: utm_campaign || null,
            onboarding_completed: false,
            created_at: trialStartAt,
            updated_at: trialStartAt,
          })
          .select('id, email, first_name, last_name')
          .single()

        if (fallbackError || !agentFallback) {
          console.error('Error creating trial agent (fallback):', fallbackError)
          return NextResponse.json(
            { error: 'Failed to create account. Please try again.' },
            { status: 500 }
          )
        }

        return await buildSuccessResponse(request, agentFallback, firstName, lastName, trialEndsAt, {
          utm_source, utm_medium, utm_campaign,
        })
      }

      return NextResponse.json(
        { error: 'Failed to create account. Please try again.' },
        { status: 500 }
      )
    }

    return await buildSuccessResponse(request, agent, firstName, lastName, trialEndsAt, {
      utm_source, utm_medium, utm_campaign,
    })
  } catch (error) {
    console.error('Trial signup error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}

/** Shared response builder: creates session, sets cookie, fires events, returns dashboard redirect. */
async function buildSuccessResponse(
  request: NextRequest,
  agent: { id: string; email: string; first_name: string; last_name: string },
  firstName: string,
  lastName: string,
  trialEndsAt: string,
  utm: { utm_source?: string; utm_medium?: string; utm_campaign?: string }
) {
  // Create a proper server-side session (same mechanism as login)
  const ipAddress =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    undefined

  const session = await createSession({
    userId: agent.id,
    userAgent: request.headers.get('user-agent') || undefined,
    ipAddress,
    rememberMe: true, // 30-day session for trial users
  })

  // Log trial_signup_completed event (non-blocking)
  void supabase
    .from('events')
    .insert({
      event_type: 'trial_signup_completed',
      agent_id: agent.id,
      event_data: {
        source: 'trial_cta',
        utm_source: utm.utm_source || null,
        utm_medium: utm.utm_medium || null,
        utm_campaign: utm.utm_campaign || null,
        plan_tier: 'trial',
        trial_days: 14,
        trial_ends_at: trialEndsAt,
      },
      created_at: new Date().toISOString(),
    })
    .then(() => {})
    .catch((err: unknown) => {
      console.error('Failed to log trial_signup_completed event:', err)
    })

  // Also log the legacy trial_started event for backwards compatibility
  void supabase
    .from('events')
    .insert({
      event_type: 'trial_started',
      agent_id: agent.id,
      event_data: {
        source: 'trial_cta',
        utm_source: utm.utm_source || null,
        utm_medium: utm.utm_medium || null,
        utm_campaign: utm.utm_campaign || null,
        plan_tier: 'trial',
        trial_days: 14,
      },
      created_at: new Date().toISOString(),
    })
    .then(() => {})
    .catch((err: unknown) => {
      console.error('Failed to log trial_started event:', err)
    })

  // Send welcome email (non-blocking)
  void sendWelcomeEmail(agent.email, agent.id, {
    agentName: `${firstName} ${lastName}`.trim() || undefined,
    planTier: 'trial',
    dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-five.vercel.app'}/dashboard`,
  }).catch((err: unknown) => {
    console.error('[trial-signup] Welcome email error:', err)
  })

  // Initialize NPS survey schedule for the new agent (non-blocking)
  void Promise.resolve(initializeSurveySchedule(agent.id)).catch((err: unknown) => {
    console.error('Failed to initialize NPS survey schedule:', err)
  })

  // Build response — redirect straight to dashboard for frictionless SLA (FR-2/FR-3)
  const response = NextResponse.json({
    success: true,
    agentId: agent.id,
    redirectTo: '/dashboard',
    message: 'Trial account created. Welcome to LeadFlow!',
    user: {
      id: agent.id,
      email: agent.email,
      firstName: firstName,
      lastName: lastName,
      onboardingCompleted: false,
      planTier: 'trial',
      trialEndsAt,
    },
  })

  // Set HTTP-only session cookie (30 days for trial)
  response.cookies.set({
    name: 'leadflow_session',
    value: session.token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  })

  return response
}
