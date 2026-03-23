import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server'
import { auth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  // Require an active authenticated session before returning any data
  const { user } = await auth(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const agentId = user.id

  try {
    // Get agent integrations
    const { data: integrations, error } = await supabase
      .from('agent_integrations')
      .select('*')
      .eq('agent_id', agentId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Integration status error:', error)
    }

    // Get Twilio settings
    const { data: settings } = await supabase
      .from('agent_settings')
      .select('sms_enabled')
      .eq('agent_id', agentId)
      .single()

    return NextResponse.json({
      fub: {
        connected: !!integrations?.fub_api_key,
        config: {
          apiKey: integrations?.fub_api_key ? '********' : '',
        },
      },
      twilio: {
        connected: settings?.sms_enabled || false,
        config: {
          phoneNumber: integrations?.twilio_phone_number || '',
        },
      },
      calcom: {
        connected: !!integrations?.cal_com_link,
        config: {
          bookingLink: integrations?.cal_com_link || '',
        },
      },
    })
  } catch (error) {
    console.error('Integration status GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
