import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer, isSupabaseConfigured } from '@/lib/supabase-server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

/**
 * POST /api/trial/start
 *
 * Frictionless trial account provisioning.
 * - Creates a new agent with plan_tier='trial', trial_ends_at=now()+30d
 * - Sets email_verified=true (no email gate per PRD)
 * - Logs trial_started event to events table
 * - Returns JWT + redirect URL to setup wizard
 *
 * Body: { email, password, name?, utm_source?, utm_medium?, utm_campaign? }
 */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }

  try {
    const body = await request.json()
    const {
      email,
      password,
      name,
      utm_source,
      utm_medium,
      utm_campaign,
    } = body

    // Validate required fields
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

    // Check for existing account
    const { data: existing } = await supabaseServer
      .from('real_estate_agents')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Sign in instead.' },
        { status: 409 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Parse optional name
    const trimmedName = (name || '').trim()
    const nameParts = trimmedName.split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    // Trial ends 30 days from now
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 30)

    // Create agent record
    const { data: agent, error: createError } = await supabaseServer
      .from('real_estate_agents')
      .insert({
        email: email.toLowerCase().trim(),
        first_name: firstName,
        last_name: lastName,
        password_hash: passwordHash,
        plan_tier: 'trial',
        trial_ends_at: trialEndsAt.toISOString(),
        source: 'trial_cta',
        email_verified: true,       // No email gate per PRD
        is_active: true,
        onboarding_completed: false,
        mrr: 0,
        // UTM attribution
        utm_source: utm_source || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id, email, first_name, last_name, plan_tier, trial_ends_at')
      .single()

    if (createError || !agent) {
      console.error('Trial account creation error:', createError)
      return NextResponse.json(
        { error: 'Failed to create account. Please try again.' },
        { status: 500 }
      )
    }

    // Log trial_started event
    await supabaseServer.from('events').insert({
      agent_id: agent.id,
      event_type: 'trial_started',
      event_data: {
        plan_tier: 'trial',
        trial_ends_at: trialEndsAt.toISOString(),
        source: 'trial_cta',
        utm_source: utm_source || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
      },
      source: 'trial_cta',
      created_at: new Date().toISOString(),
    }).then(({ error }) => {
      if (error) console.error('Failed to log trial_started event:', error)
    })

    // Generate JWT session token
    const token = jwt.sign(
      {
        id: agent.id,
        email: agent.email,
        plan_tier: agent.plan_tier,
        trial_ends_at: agent.trial_ends_at,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    )

    // Build response with cookie
    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: agent.id,
        email: agent.email,
        firstName: agent.first_name,
        lastName: agent.last_name,
        planTier: agent.plan_tier,
        trialEndsAt: agent.trial_ends_at,
      },
      redirectTo: '/setup',
    })

    // Set auth cookie (30-day trial)
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    })

    return response

  } catch (error) {
    console.error('Trial start error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
