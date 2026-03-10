import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server'
import bcrypt from 'bcryptjs'

/** Pilot duration in days */
const PILOT_DURATION_DAYS = 60

/**
 * Send Telegram notification about new pilot signup.
 * Fire-and-forget — never blocks onboarding.
 */
async function notifyPilotSignup(name: string, email: string) {
  const token = process.env.ORCHESTRATOR_BOT_TOKEN
  const chatId = process.env.TELEGRAM_NOTIFY_CHAT_ID
  if (!token || !chatId) return

  const text = `🚀 *New Pilot Agent Signed Up*\n\nName: ${name}\nEmail: ${email}\nPlan: Free Pilot (${PILOT_DURATION_DAYS} days)\nAction: Manual conversion needed before expiry`

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    })
  } catch (err) {
    console.error('Telegram notification failed (non-blocking):', err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      state,
      calcomLink,
      smsPhoneNumber,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
    } = body

    // Validate required fields — NO credit card or billing info needed
    if (!email || !password || !firstName || !lastName || !phoneNumber || !state) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('real_estate_agents')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Calculate pilot expiry (60 days from now)
    const now = new Date()
    const pilotExpiresAt = new Date(now.getTime() + PILOT_DURATION_DAYS * 24 * 60 * 60 * 1000)

    // Create agent account — free pilot, no credit card required
    const { data: agent, error: agentError } = await supabase
      .from('real_estate_agents')
      .insert({
        email: email.toLowerCase(),
        password_hash: hashedPassword,
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
        state,
        status: 'onboarding',
        plan_tier: 'pilot',
        pilot_started_at: now.toISOString(),
        pilot_expires_at: pilotExpiresAt.toISOString(),
        // No stripe_customer_id — free pilot, no card required
        timezone: 'America/New_York', // Default, can be updated later
        created_at: now.toISOString(),
        utm_source: utmSource || null,
        utm_medium: utmMedium || null,
        utm_campaign: utmCampaign || null,
        utm_content: utmContent || null,
        utm_term: utmTerm || null,
      })
      .select()
      .single()

    if (agentError) {
      console.error('Agent creation error:', agentError)
      return NextResponse.json(
        { error: 'Failed to create agent account' },
        { status: 500 }
      )
    }

    // Create integrations record if provided
    if (calcomLink || smsPhoneNumber) {
      const { error: intError } = await supabase
        .from('agent_integrations')
        .insert({
          agent_id: agent.id,
          cal_com_link: calcomLink || null,
          twilio_phone_number: smsPhoneNumber || null,
          created_at: new Date().toISOString(),
        })

      if (intError) {
        console.error('Integration creation error:', intError)
        // Don't fail the whole request if integrations fail
      }
    }

    // Create default settings
    const { error: settingsError } = await supabase
      .from('agent_settings')
      .insert({
        agent_id: agent.id,
        auto_response_enabled: true,
        sms_enabled: !!smsPhoneNumber,
        email_notifications: true,
        created_at: new Date().toISOString(),
      })

    if (settingsError) {
      console.error('Settings creation error:', settingsError)
    }

    // Send welcome email (implement email service)
    // await sendWelcomeEmail(agent.email, agent.first_name)

    // Notify Stojan via Telegram about new pilot signup (fire-and-forget)
    notifyPilotSignup(`${firstName} ${lastName}`, email.toLowerCase()).catch(() => {})

    // Return success with agent data (no password)
    const { password_hash, ...agentSafe } = agent

    return NextResponse.json(
      {
        message: 'Welcome to your free pilot! You have 60 days of full access.',
        agent: agentSafe,
        pilot: {
          plan: 'pilot',
          durationDays: PILOT_DURATION_DAYS,
          startsAt: now.toISOString(),
          expiresAt: pilotExpiresAt.toISOString(),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Onboarding error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
