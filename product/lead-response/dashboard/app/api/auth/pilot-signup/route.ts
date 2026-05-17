import { NextRequest, NextResponse } from 'next/server'
import { postgrestAdmin } from '@/lib/db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { createVerificationToken, sendVerificationEmail } from '@/lib/verification-email'
import { sendWelcomeEmail } from '@/lib/email-service'
import { logger } from '@/lib/logger'
import { encrypt } from '@/lib/services/encryption-service'

const supabase = postgrestAdmin

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

// Telegram notification config
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID

/**
 * Send Telegram notification to Stojan when new pilot agent signs up
 */
async function notifyTelegram(name: string, email: string, brokerage: string | null): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    logger.info('[pilot-signup] Telegram not configured, skipping notification')
    return
  }

  const message = `
🎉 <b>New Pilot Agent Signed Up!</b>

👤 <b>Name:</b> ${name || 'Not provided'}
📧 <b>Email:</b> ${email}
🏢 <b>Brokerage:</b> ${brokerage || 'Not provided'}
⏰ <b>Signed up at:</b> ${new Date().toLocaleString('en-US', { timeZone: 'America/Toronto' })}

<a href="https://leadflow-ai-five.vercel.app/admin">View in Admin</a>
  `.trim()

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    })

    if (!response.ok) {
      logger.error('[pilot-signup] Telegram notification failed:', await response.text())
    } else {
      logger.info('[pilot-signup] Telegram notification sent successfully')
    }
  } catch (err) {
    logger.error('[pilot-signup] Telegram notification error:', err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, brokerage_name, fub_api_key, utm_source, utm_medium, utm_campaign } = await request.json()

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

    // Check if account already exists
    const { data: existingAgent } = await supabase
      .from('real_estate_agents')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existingAgent) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in instead.' },
        { status: 409 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Parse name into first/last
    const nameParts = (name || '').trim().split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    // Calculate pilot dates (60 days from now)
    const pilotStartedAt = new Date().toISOString()
    const pilotExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()

    // Create agent record with pilot tier
    const { data: agent, error: createError } = await supabase
      .from('real_estate_agents')
      .insert({
        email: email.toLowerCase(),
        first_name: firstName,
        last_name: lastName,
        password_hash: passwordHash,
        email_verified: true, // No email gate for pilot users per PRD
        plan_tier: 'pilot',
        pilot_started_at: pilotStartedAt,
        pilot_expires_at: pilotExpiresAt,
        mrr: 0,
        source: 'pilot_signup',
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
      logger.error('Error creating pilot agent:', createError)
      return NextResponse.json(
        { error: 'Failed to create account. Please try again.' },
        { status: 500 }
      )
    }

    // Create pilot_progress record for admin white-glove tracking (non-blocking)
    void Promise.resolve(supabase.from('pilot_progress').insert({
      agent_id: agent.id,
      stage: 'signed_up',
      stage_entered_at: new Date().toISOString(),
      pilot_cohort: 'cohort-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })).catch((err: unknown) => {
      logger.error('[pilot-signup] Failed to create pilot_progress record:', err)
    })

    // Create agent integrations record if FUB API key provided — encrypt before storing
    if (fub_api_key) {
      try {
        await supabase
          .from('agent_integrations')
          .insert({
            agent_id: agent.id,
            follow_up_boss_api_key: encrypt(fub_api_key),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
      } catch (err) {
        logger.error('[pilot-signup] Failed to store FUB API key:', err)
        // Non-blocking — don't fail signup if this fails
      }
    }

    // Log pilot_started event (non-blocking)
    void Promise.resolve(supabase.from('events').insert({
      event_type: 'pilot_started',
      agent_id: agent.id,
      event_data: {
        source: 'pilot_signup',
        utm_source: utm_source || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
        plan_tier: 'pilot',
        pilot_days: 60,
        has_fub_key: !!fub_api_key
      },
      created_at: new Date().toISOString()
    })).catch((err: unknown) => {
      logger.error('Failed to log pilot_started event:', err)
    })

    // Create verification token and send email (non-blocking)
    void (async () => {
      try {
        const verificationToken = await createVerificationToken(agent.id)
        if (verificationToken) {
          await sendVerificationEmail(agent.email, agent.id, firstName, verificationToken)
        }
      } catch (err) {
        logger.error('Failed to send verification email:', err)
      }
    })()

    // Send welcome email via shared email service (non-blocking)
    void sendWelcomeEmail(agent.email, agent.id, {
      agentName: `${agent.first_name} ${agent.last_name}`.trim() || undefined,
      planTier: 'pilot',
      dashboardUrl: 'https://leadflow-ai-five.vercel.app/dashboard/onboarding'
    }).catch((err: unknown) => {
      logger.error('[pilot-signup] Welcome email error:', err)
    })

    // Send Telegram notification to Stojan (non-blocking)
    void notifyTelegram(`${agent.first_name} ${agent.last_name}`.trim(), agent.email, brokerage_name || null)

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

    // Set auth cookie and return success with token + user for localStorage storage
    const response = NextResponse.json({
      success: true,
      agentId: agent.id,
      redirectTo: '/dashboard/onboarding',
      message: 'Pilot account created successfully',
      token,
      user: {
        id: agent.id,
        email: agent.email,
        firstName: agent.first_name,
        lastName: agent.last_name,
        onboardingCompleted: false } })

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/'
    })

    return response
  } catch (error) {
    logger.error('Pilot signup error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
