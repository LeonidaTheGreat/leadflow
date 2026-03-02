import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server'
import twilio from 'twilio'

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, accountSid, authToken } = await request.json()
    const agentId = request.headers.get('x-agent-id') || 'test-agent-id'

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    // Clean and validate phone number
    const cleanPhone = phoneNumber.replace(/\D/g, '')
    if (cleanPhone.length !== 10) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      )
    }

    // If account SID and auth token provided, verify them
    if (accountSid && authToken) {
      try {
        const client = twilio(accountSid, authToken)
        // Try to fetch account info to verify credentials
        await client.api.accounts(accountSid).fetch()
      } catch (error) {
        return NextResponse.json(
          { valid: false, message: 'Invalid Twilio credentials' },
          { status: 401 }
        )
      }

      // Store credentials
      const { error } = await supabase
        .from('agent_integrations')
        .upsert({
          agent_id: agentId,
          twilio_phone_number: cleanPhone,
          twilio_account_sid: accountSid,
          twilio_auth_token: authToken,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'agent_id',
        })

      if (error) {
        console.error('Twilio connection error:', error)
        return NextResponse.json(
          { error: 'Failed to store Twilio credentials' },
          { status: 500 }
        )
      }
    } else {
      // Just store phone number (using system Twilio)
      const { error } = await supabase
        .from('agent_integrations')
        .upsert({
          agent_id: agentId,
          twilio_phone_number: cleanPhone,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'agent_id',
        })

      if (error) {
        console.error('Twilio connection error:', error)
        return NextResponse.json(
          { error: 'Failed to store phone number' },
          { status: 500 }
        )
      }
    }

    // Enable SMS in settings
    await supabase
      .from('agent_settings')
      .upsert({
        agent_id: agentId,
        sms_enabled: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'agent_id',
      })

    return NextResponse.json({
      valid: true,
      message: 'Twilio connected successfully',
    })
  } catch (error) {
    console.error('Twilio connect error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Disconnect Twilio
export async function DELETE(request: NextRequest) {
  try {
    const agentId = request.headers.get('x-agent-id') || 'test-agent-id'

    const { error } = await supabase
      .from('agent_integrations')
      .update({
        twilio_phone_number: null,
        twilio_account_sid: null,
        twilio_auth_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq('agent_id', agentId)

    if (error) {
      console.error('Twilio disconnect error:', error)
      return NextResponse.json(
        { error: 'Failed to disconnect Twilio' },
        { status: 500 }
      )
    }

    // Disable SMS in settings
    await supabase
      .from('agent_settings')
      .update({
        sms_enabled: false,
        updated_at: new Date().toISOString(),
      })
      .eq('agent_id', agentId)

    return NextResponse.json({
      message: 'Twilio disconnected successfully',
    })
  } catch (error) {
    console.error('Twilio disconnect error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}