import { NextRequest, NextResponse } from 'next/server'
import { postgrestAdmin } from '@/lib/db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { sendWelcomeEmail } from '@/lib/email-service'
import { initializeSurveySchedule } from '@/lib/nps-service'
import { createSession } from '@/lib/services/AuthService'
import { logger } from '@/lib/logger'

const supabase = postgrestAdmin

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, firstName: firstNameParam, lastName: lastNameParam, utm_source, utm_medium, utm_campaign } = await request.json()

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

    // Parse optional name — support both name (string) and firstName/lastName params
    let firstName: string
    let lastName: string
    if (firstNameParam || lastNameParam) {
      firstName = (firstNameParam || '').trim()
      lastName = (lastNameParam || '').trim()
    } else {
      const nameParts = (name || '').trim().split(' ')
      firstName = nameParts[0] || ''
      lastName = nameParts.slice(1).join(' ') || ''
    }
    // Ensure first_name is non-empty (DB NOT NULL constraint)
    if (!firstName) firstName = email.split('@')[0]

    // Calculate trial end date (14 days from now)
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    const now = new Date().toISOString()

    // Create agent record with trial tier
    const { data: agent, error: createError } = await supabase
      .from('real_estate_agents')
      .insert({
        email: email.toLowerCase(),
        first_name: firstName,
        last_name: lastName,
        password_hash: passwordHash,
        email_verified: true, // No email verification gate for trial (per PRD)
        plan_tier: 'trial',
        trial_ends_at: trialEndsAt,
        mrr: 0,
        source: 'trial_cta',
        utm_source: utm_source || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
        trial_start_date: now,
        onboarding_completed: false, // Sample data is served in-memory via /api/sample-leads
        onboarding_step: 0,
        created_at: now,
        updated_at: now
      })
      .select('id, email, first_name, last_name')
      .single()

    if (createError) {
      logger.error('Error creating trial agent:', createError)
      return NextResponse.json(
        { error: 'Failed to create account. Please try again.' },
        { status: 500 }
      )
    }

    // Sample leads are served in-memory by GET /api/sample-leads (eligibility: onboarding_completed = false).
    // No DB writes for sample data — avoids schema coupling and keeps the leads table clean.

    // Initialize NPS survey schedule for the new agent (non-blocking)
    void Promise.resolve(initializeSurveySchedule(agent.id)).catch((err: unknown) => {
      logger.error('Failed to initialize NPS survey schedule:', err)
    })

    // Log trial_signup_completed event (FR-8: Instrumentation)
    void (async () => {
      try {
        await supabase.from('events').insert({
          event_type: 'trial_signup_completed',
          agent_id: agent.id,
          properties: {
            source: 'trial_cta',
            utm_source: utm_source || null,
            utm_medium: utm_medium || null,
            utm_campaign: utm_campaign || null,
            plan_tier: 'trial',
            trial_days: 14,
            has_name: !!name
          },
          created_at: new Date().toISOString()
        })
      } catch (err: unknown) {
        logger.error('Failed to log trial_signup_completed event:', err)
      }
    })()

    // Send welcome email (non-blocking) and mark as sent
    void (async () => {
      try {
        await sendWelcomeEmail(
          agent.email,
          agent.id,
          {
            agentName: `${agent.first_name} ${agent.last_name}`.trim() || undefined,
            planTier: 'trial',
            dashboardUrl: 'https://leadflow-ai-five.vercel.app/dashboard/onboarding',
          }
        )
        // Mark welcome email as sent in the agent record
        await supabase
          .from('real_estate_agents')
          .update({ trial_email_welcome_sent: true })
          .eq('id', agent.id)
      } catch (err: unknown) {
        logger.error('[trial-signup] Welcome email error:', err)
        // Email failure should not block signup - just log and continue
      }
    })()

    // Log dashboard_first_paint will be tracked on client-side
    // Log sample_data_rendered will be tracked when dashboard loads

    // Create server-side session for session revocation capability
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? request.headers.get('x-real-ip')
      ?? undefined
    const session = await createSession({
      userId: agent.id,
      userAgent: request.headers.get('user-agent') || undefined,
      ipAddress,
      rememberMe: true, // Trial users get 30-day session
    })

    // Generate JWT token for immediate login (kept for backward compatibility)
    const token = jwt.sign(
      {
        userId: agent.id,
        email: agent.email,
        name: `${agent.first_name} ${agent.last_name}`.trim()
      },
      JWT_SECRET,
      { expiresIn: '14d' }
    )

    // Set auth cookie and return success with token + user for localStorage storage
    const response = NextResponse.json({
      success: true,
      agentId: agent.id,
      redirectTo: '/dashboard/onboarding',
      message: 'Trial account created successfully',
      token,
      user: {
        id: agent.id,
        email: agent.email,
        firstName: agent.first_name,
        lastName: agent.last_name,
        onboardingCompleted: false,
      },
    })

    // Set JWT auth cookie (backward compatibility)
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 14 * 24 * 60 * 60, // 14 days
      path: '/'
    })

    // Set server-side session cookie for session revocation capability
    response.cookies.set({
      name: 'leadflow_session',
      value: session.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60, // 30 days (remember me)
      path: '/',
    })

    return response

  } catch (error) {
    logger.error('Trial signup error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
