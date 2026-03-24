import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { sendWelcomeEmail } from '@/lib/email-service'
import { initializeSurveySchedule } from '@/lib/nps-service'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

// Sample lead data for first-time users
const SAMPLE_LEADS = [
  {
    name: 'Sarah Johnson',
    phone: '+15551234567',
    email: 'sarah.j@example.com',
    source: 'Zillow',
    status: 'new',
    property_interest: '3-bedroom home in Austin',
    budget: '$600,000 - $750,000',
    timeline: '1-3 months',
    is_sample: true,
    sample_type: 'demo'
  },
  {
    name: 'Michael Chen',
    phone: '+15559876543',
    email: 'mchen@example.com',
    source: 'Realtor.com',
    status: 'responded',
    property_interest: 'Downtown condo',
    budget: '$400,000 - $500,000',
    timeline: '3-6 months',
    is_sample: true,
    sample_type: 'demo'
  },
  {
    name: 'Emily Rodriguez',
    phone: '+15555678901',
    email: 'emily.r@example.com',
    source: 'Facebook Ads',
    status: 'qualified',
    property_interest: 'Family home with pool',
    budget: '$800,000+',
    timeline: 'ASAP',
    is_sample: true,
    sample_type: 'demo'
  }
]

// Sample AI responses for demo leads
const SAMPLE_AI_RESPONSES = [
  {
    content: "Hi Sarah! 👋 I'm your AI assistant from LeadFlow. I'd love to help you find a 3-bedroom home in Austin. Are you looking in any specific neighborhoods?",
    sender_type: 'ai',
    is_sample: true
  },
  {
    content: "Hi Michael! Thanks for reaching out about downtown condos. I can definitely help you find something in the $400-500K range. When would be a good time for a quick call to discuss your preferences?",
    sender_type: 'ai',
    is_sample: true
  },
  {
    content: "Hi Emily! 🏊‍♀️ A family home with a pool sounds wonderful! I have several listings that might interest you. Would you like me to send you details on properties with pools in your area?",
    sender_type: 'ai',
    is_sample: true
  }
]

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

<<<<<<< HEAD
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
        trial_started_at: now,
        trial_ends_at: trialEndsAt,
        mrr: 0,
        source: 'trial_cta',
        utm_source: utm_source || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
        onboarding_completed: false,
        onboarding_step: 'welcome', // Track wizard progress
        created_at: now,
        updated_at: now
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

    // Create sample leads for the new agent (FR-4: First Session Seeded Data)
    const sampleLeadsWithAgent = SAMPLE_LEADS.map((lead, index) => ({
      ...lead,
      agent_id: agent.id,
      created_at: new Date(Date.now() - index * 3600000).toISOString(), // Stagger creation times
      updated_at: new Date(Date.now() - index * 3600000).toISOString()
    }))

    const { data: createdLeads, error: leadsError } = await supabase
      .from('leads')
      .insert(sampleLeadsWithAgent)
      .select('id')

    if (leadsError) {
      console.error('Error creating sample leads:', leadsError)
      // Don't fail signup if sample leads fail - continue anyway
    } else if (createdLeads) {
      // Create sample AI responses for each lead
      const sampleMessages = createdLeads.map((lead, index) => ({
        lead_id: lead.id,
        agent_id: agent.id,
        content: SAMPLE_AI_RESPONSES[index]?.content || SAMPLE_AI_RESPONSES[0].content,
        sender_type: 'ai',
        status: 'sent',
        is_sample: true,
        created_at: new Date(Date.now() - index * 3600000 + 60000).toISOString() // 1 min after lead
      }))

      await supabase.from('messages').insert(sampleMessages)
    }

    // Initialize NPS survey schedule for the new agent (non-blocking)
    void Promise.resolve(initializeSurveySchedule(agent.id)).catch((err: unknown) => {
      console.error('Failed to initialize NPS survey schedule:', err)
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
        console.error('Failed to log trial_signup_completed event:', err)
      }
    })()

    // Send welcome email (non-blocking)
    void sendWelcomeEmail(
      agent.email,
      agent.id,
      {
        agentName: `${agent.first_name} ${agent.last_name}`.trim() || undefined,
        planTier: 'trial',
        dashboardUrl: 'https://leadflow-ai-five.vercel.app/dashboard',
      }
    ).catch((err: unknown) => {
      console.error('[trial-signup] Welcome email error:', err)
    })

    // Log dashboard_first_paint will be tracked on client-side
    // Log sample_data_rendered will be tracked when dashboard loads

    // Generate JWT token for immediate login
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
      redirectTo: '/dashboard', // Redirect to dashboard with sample data and onboarding wizard
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

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 14 * 24 * 60 * 60, // 14 days
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

async function logAnalyticsEvent(
  eventType: string,
  agentId: string,
  data: Record<string, any>
) {
  try {
    await supabase.from('events').insert({
      agent_id: agentId,
      event_type: eventType,
      event_data: data,
      source: 'trial_signup',
      created_at: new Date().toISOString()
    })
  } catch (err) {
    // Non-blocking - log and continue
    console.error('Failed to log analytics event:', err)
  }
}
