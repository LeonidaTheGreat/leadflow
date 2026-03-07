import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server'
import bcrypt from 'bcryptjs'

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
    } = body

    // Validate required fields
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

    // Create agent account
    const { data: agent, error: agentError } = await supabase
      .from('real_estate_agents')
      .insert({
        email: email.toLowerCase(),
        password_hash: hashedPassword,
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
        state,
        email_verified: true, // Auto-verify for now (no email verification flow yet)
        status: 'onboarding',
        timezone: 'America/New_York', // Default, can be updated later
        created_at: new Date().toISOString(),
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

    // Return success with agent data (no password)
    const { password_hash, ...agentSafe } = agent

    return NextResponse.json(
      {
        message: 'Onboarding completed successfully',
        agent: agentSafe,
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
