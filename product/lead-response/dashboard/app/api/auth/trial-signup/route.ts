import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { createSession } from '@/lib/session'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Simple in-memory rate limiting
const rateLimit = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = rateLimit.get(ip)
  if (!record || now > record.resetTime) {
    rateLimit.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return true
  }
  if (record.count >= RATE_LIMIT_MAX) return false
  record.count++
  return true
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { email, password, name, utm_source, utm_medium, utm_campaign, utm_content, utm_term } = body

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

    // Check for duplicate email
    const { data: existingAgent } = await supabase
      .from('real_estate_agents')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

    if (existingAgent) {
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

    // Calculate trial end date (30 days from now)
    const now = new Date()
    const trialEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Create trial account
    const { data: agent, error: createError } = await supabase
      .from('real_estate_agents')
      .insert({
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        plan_tier: 'trial',
        trial_ends_at: trialEndsAt.toISOString(),
        mrr: 0,
        source: 'trial_cta',
        email_verified: true, // No email verification gate for trial (per PRD - reduces friction)
        is_active: true,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        // UTM attribution
        utm_source: utm_source || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
        utm_content: utm_content || null,
        utm_term: utm_term || null,
      })
      .select('id, email, first_name, last_name')
      .single()

    if (createError || !agent) {
      console.error('Trial signup - agent creation error:', createError)
      return NextResponse.json(
        { error: 'Failed to create account. Please try again.' },
        { status: 500 }
      )
    }

    // Log trial_started analytics event (best-effort)
    try {
      await supabase.from('analytics_events').insert({
        event_type: 'trial_started',
        agent_id: agent.id,
        properties: {
          plan_tier: 'trial',
          trial_ends_at: trialEndsAt.toISOString(),
          source: 'trial_cta',
          utm_source,
          utm_medium,
          utm_campaign,
        },
        created_at: now.toISOString(),
      })
    } catch (_e) {
      // analytics_events table may not exist yet — do not fail the signup
    }

    // Create a session for immediate login
    const userAgent = request.headers.get('user-agent') || undefined
    const ipAddress = ip !== 'unknown' ? ip : undefined

    const session = await createSession({
      userId: agent.id,
      userAgent,
      ipAddress,
      rememberMe: false,
    })

    const response = NextResponse.json({
      success: true,
      agentId: agent.id,
      redirectTo: '/dashboard/onboarding',
      message: 'Trial account created successfully',
    })

    // Set session cookie
    response.cookies.set('leadflow_session', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    })

    return response
  } catch (error: unknown) {
    console.error('Trial signup error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
