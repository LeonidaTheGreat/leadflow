import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(request: NextRequest) {
  try {
    const { integration } = await request.json()
    const agentId = request.headers.get('x-agent-id') || 'test-agent-id'

    if (!integration) {
      return NextResponse.json(
        { error: 'Integration name is required' },
        { status: 400 }
      )
    }

    let updateData: Record<string, any> = {}

    switch (integration) {
      case 'fub':
        updateData = { fub_api_key: null }
        break
      case 'twilio':
        updateData = { 
          twilio_phone_number: null,
          twilio_account_sid: null,
          twilio_auth_token: null,
        }
        // Also disable SMS in settings
        await supabase
          .from('agent_settings')
          .update({ sms_enabled: false })
          .eq('agent_id', agentId)
        break
      case 'calcom':
        updateData = { cal_com_link: null }
        break
      default:
        return NextResponse.json(
          { error: 'Unknown integration' },
          { status: 400 }
        )
    }

    const { error } = await supabase
      .from('agent_integrations')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('agent_id', agentId)

    if (error) {
      console.error('Disconnect error:', error)
      return NextResponse.json(
        { error: 'Failed to disconnect integration' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: `${integration} disconnected successfully`,
    })
  } catch (error) {
    console.error('Disconnect error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}