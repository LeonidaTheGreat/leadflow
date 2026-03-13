import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { sendWelcomeEmail } from '@/lib/email-service'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

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

    // Calculate trial end date (30 days from now per PRD)
    const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    // Create agent record with trial tier
    const { data: agent, error: createError } = await supabase
      .from('real_estate_agents')
      .insert({
        email: email.toLowerCase(),
        first_name: firstName,
        last_name: lastName,
        password_hash: passwordHash,
        email_verified: true, // No email verification gate for trial (per PRD §6)
        plan_tier: 'trial',
        trial_ends_at: trialEndsAt,
        mrr: 0,
        source: 'trial_cta',
        utm_source: utm_source || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
        onboarding_completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id, email, first_name, last_name')
      .single()

    if (createError) {
      console.error('Error creating trial agent:', createError)
      return NextResponse.json(
        { error: 'Failed to create account. Please try again.' },
        { status: 500 }
      )
    }

    // Log trial_started event (fire-and-forget, non-blocking)
    void (async () => {
      try {
        await supabase.from('analytics_events').insert({
          event_type: 'trial_started',
          agent_id: agent.id,
          properties: {
            source: 'trial_cta',
            utm_source: utm_source || null,
            utm_medium: utm_medium || null,
            utm_campaign: utm_campaign || null,
            plan_tier: 'trial',
            trial_days: 30
          },
          created_at: new Date().toISOString()
        })
      } catch (err: unknown) {
        // Non-blocking — don't fail signup if analytics insert fails
        console.error('Failed to log trial_started event:', err)
      }
    })()

    // Send welcome email (non-blocking)
    void sendWelcomeEmail(
      agent.email,
      agent.id,
      {
        agentName: `${agent.first_name} ${agent.last_name}`.trim() || undefined,
        planTier: 'trial',
        dashboardUrl: 'https://leadflow-ai-five.vercel.app/dashboard/onboarding',
      }
    ).catch((err: unknown) => {
      console.error('[trial-signup] Welcome email error:', err)
    })

    // Generate JWT token for immediate login
    const token = jwt.sign(
      {
        userId: agent.id,
        email: agent.email,
        name: `${agent.first_name} ${agent.last_name}`.trim()
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    )

    // Set auth cookie and return success
    const response = NextResponse.json({
      success: true,
      agentId: agent.id,
      redirectTo: '/dashboard/onboarding',
      message: 'Trial account created successfully'
    })

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/'
    })

    return response

  } catch (error) {
    console.error('Trial signup error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
