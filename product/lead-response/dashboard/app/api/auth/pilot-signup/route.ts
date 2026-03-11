import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { createVerificationToken, sendVerificationEmail } from '@/lib/verification-email'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

// Telegram notification config
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID

/**
 * Send Telegram notification to Stojan when new pilot agent signs up
 */
async function notifyTelegram(name: string, email: string, brokerage: string | null): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log('[pilot-signup] Telegram not configured, skipping notification')
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
      console.error('[pilot-signup] Telegram notification failed:', await response.text())
    } else {
      console.log('[pilot-signup] Telegram notification sent successfully')
    }
  } catch (err) {
    console.error('[pilot-signup] Telegram notification error:', err)
  }
}

/**
 * Send welcome email to new pilot agent
 */
async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  try {
    // Check if Resend is configured
    const RESEND_API_KEY = process.env.RESEND_API_KEY
    const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@leadflow.ai'

    if (!RESEND_API_KEY) {
      console.log('[pilot-signup] RESEND_API_KEY not configured, skipping welcome email')
      return
    }

    const firstName = name?.split(' ')[0] || 'there'

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: `LeadFlow AI <${FROM_EMAIL}>`,
        to: email,
        subject: 'Welcome to LeadFlow AI - Your Free Pilot Starts Now!',
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to LeadFlow AI</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #10b981; margin-bottom: 10px;">🎉 Welcome to LeadFlow AI!</h1>
    <p style="font-size: 18px; color: #666;">Your free 60-day pilot starts now</p>
  </div>

  <div style="background: #f9fafb; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
    <h2 style="margin-top: 0; color: #111;">Hi ${firstName},</h2>
    <p>Thanks for signing up for LeadFlow AI! You're now part of our exclusive pilot program with <strong>60 days of free access</strong> — no credit card required.</p>
    
    <p>Here's what happens next:</p>
    <ol style="padding-left: 20px;">
      <li style="margin-bottom: 10px;"><strong>Connect your FUB account</strong> — We'll walk you through this in the onboarding wizard</li>
      <li style="margin-bottom: 10px;"><strong>Set up your SMS number</strong> — Choose a local number for AI responses</li>
      <li style="margin-bottom: 10px;"><strong>Watch the magic happen</strong> — Our AI will respond to your leads in under 30 seconds, 24/7</li>
    </ol>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <a href="https://leadflow-ai-five.vercel.app/setup" 
       style="display: inline-block; background: #10b981; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
      Start Onboarding →
    </a>
  </div>

  <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin-bottom: 24px;">
    <h3 style="margin-top: 0; color: #1e40af;">📚 Quick Start Guide</h3>
    <p style="margin-bottom: 0;">Need help? Check out our <a href="https://leadflow-ai-five.vercel.app/help" style="color: #3b82f6;">Help Center</a> or reply to this email — our team is here to help!</p>
  </div>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  
  <p style="font-size: 14px; color: #6b7280; text-align: center;">
    You're receiving this because you signed up for LeadFlow AI.<br>
    Questions? Contact us at <a href="mailto:support@leadflow.ai" style="color: #6b7280;">support@leadflow.ai</a>
  </p>
</body>
</html>
        `
      })
    })

    if (!response.ok) {
      console.error('[pilot-signup] Welcome email failed:', await response.text())
    } else {
      console.log('[pilot-signup] Welcome email sent successfully')
    }
  } catch (err) {
    console.error('[pilot-signup] Welcome email error:', err)
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
        email_verified: false, // Require email verification before login
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
      console.error('Error creating pilot agent:', createError)
      return NextResponse.json(
        { error: 'Failed to create account. Please try again.' },
        { status: 500 }
      )
    }

    // Create agent integrations record if FUB API key provided
    if (fub_api_key) {
      try {
        await supabase
          .from('agent_integrations')
          .insert({
            agent_id: agent.id,
            follow_up_boss_api_key: fub_api_key,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
      } catch (err) {
        console.error('[pilot-signup] Failed to store FUB API key:', err)
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
      console.error('Failed to log pilot_started event:', err)
    })

    // Create verification token and send email (non-blocking)
    void (async () => {
      try {
        const verificationToken = await createVerificationToken(agent.id)
        if (verificationToken) {
          await sendVerificationEmail(agent.email, agent.id, firstName, verificationToken)
        }
      } catch (err) {
        console.error('Failed to send verification email:', err)
      }
    })()

    // Send welcome email (non-blocking)
    void sendWelcomeEmail(agent.email, `${agent.first_name} ${agent.last_name}`.trim())

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

    // Return success - user must verify email before logging in
    // Do NOT set auth cookie - they need to verify email first
    return NextResponse.json({
      success: true,
      agentId: agent.id,
<<<<<<< HEAD
      redirectTo: `/check-your-inbox?email=${encodeURIComponent(agent.email)}`,
      message: 'Pilot account created successfully. Please check your email to verify your account.'
    })

  } catch (error) {
    console.error('Pilot signup error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
