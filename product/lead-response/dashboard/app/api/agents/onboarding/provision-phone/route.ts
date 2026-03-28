import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase, isSupabaseConfigured } from '@/lib/supabase-server'
import { getAuthUserId } from '@/lib/auth'
import twilio from 'twilio'

/**
 * POST /api/agents/onboarding/provision-phone
 *
 * Provisions a real Twilio phone number from LeadFlow's account and assigns
 * it to the agent. Called when the agent selects "Use LeadFlow Number" in
 * the Setup Wizard (Step 2).
 *
 * Body params:
 *   areaCode?: string   - optional 3-digit US area code to search near
 *
 * Returns:
 *   { success: true, phoneNumber: "+15551234567" }
 *   { success: false, error: "..." }
 */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const agentId = await getAuthUserId(request)
  if (!agentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    let areaCode: string | undefined
    try {
      const body = await request.json()
      areaCode = body.areaCode?.toString().replace(/\D/g, '').slice(0, 3)
    } catch {
      // Body is optional — no area code specified
    }

    // Validate area code if provided
    if (areaCode && !/^\d{3}$/.test(areaCode)) {
      return NextResponse.json(
        { success: false, error: 'Area code must be exactly 3 digits' },
        { status: 400 }
      )
    }

    // Ensure LeadFlow Twilio credentials are configured
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN

    if (!accountSid || !authToken) {
      console.error('[provision-phone] Missing Twilio credentials in environment')
      return NextResponse.json(
        { success: false, error: 'Twilio credentials not configured on server' },
        { status: 503 }
      )
    }

    // Search for an available US local number
    const client = twilio(accountSid, authToken)

    const searchParams: Record<string, string | boolean> = {
      smsEnabled: true,
      voiceEnabled: false,
    }
    if (areaCode) {
      searchParams.areaCode = areaCode
    }

    let availableNumbers
    try {
      availableNumbers = await client.availablePhoneNumbers('US')
        .local.list({ ...searchParams, limit: 5 })
    } catch (twilioError: any) {
      console.error('[provision-phone] Twilio search error:', twilioError?.message)
      return NextResponse.json(
        { success: false, error: 'Failed to search for available phone numbers' },
        { status: 502 }
      )
    }

    if (!availableNumbers || availableNumbers.length === 0) {
      // Fall back to search without area code constraint if area code was specified
      if (areaCode) {
        try {
          availableNumbers = await client.availablePhoneNumbers('US')
            .local.list({ smsEnabled: true, voiceEnabled: false, limit: 5 })
        } catch (twilioError: any) {
          console.error('[provision-phone] Twilio fallback search error:', twilioError?.message)
          return NextResponse.json(
            { success: false, error: 'Failed to find available phone numbers' },
            { status: 502 }
          )
        }
      }

      if (!availableNumbers || availableNumbers.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No phone numbers available at this time. Please try again.' },
          { status: 503 }
        )
      }
    }

    // Pick the first available number
    const selectedNumber = availableNumbers[0].phoneNumber

    // Purchase (provision) the number on LeadFlow's Twilio account
    let provisionedNumber
    try {
      provisionedNumber = await client.incomingPhoneNumbers.create({
        phoneNumber: selectedNumber,
        friendlyName: `LeadFlow Agent ${agentId}`,
        smsUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/twilio`,
        smsMethod: 'POST',
      })
    } catch (twilioError: any) {
      console.error('[provision-phone] Twilio provision error:', twilioError?.message)
      return NextResponse.json(
        { success: false, error: 'Failed to provision phone number. Please try again.' },
        { status: 502 }
      )
    }

    const assignedNumber = provisionedNumber.phoneNumber
    // Strip the +1 prefix to store as 10-digit string (matches existing schema)
    const cleanPhone = assignedNumber.replace(/^\+1/, '').replace(/\D/g, '')

    // Upsert the provisioned number into agent_integrations
    const { error: dbError } = await supabase
      .from('agent_integrations')
      .upsert(
        {
          agent_id: agentId,
          twilio_phone_number: cleanPhone,
          twilio_phone_sid: provisionedNumber.sid,
          twilio_phone_e164: assignedNumber,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'agent_id' }
      )

    if (dbError) {
      console.error('[provision-phone] DB error:', dbError)
      // Number was provisioned but DB write failed — log for manual cleanup
      console.error('[provision-phone] ORPHANED TWILIO NUMBER — SID:', provisionedNumber.sid)
      return NextResponse.json(
        { success: false, error: 'Phone number provisioned but could not be saved. Contact support.' },
        { status: 500 }
      )
    }

    // Enable SMS in agent settings
    await supabase
      .from('agent_settings')
      .upsert(
        {
          agent_id: agentId,
          sms_enabled: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'agent_id' }
      )

    // Update agent onboarding state
    await supabase
      .from('real_estate_agents')
      .update({
        phone_configured: true,
        onboarding_step: 2,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agentId)
    console.log('[provision-phone] Provisioned:', assignedNumber, 'for agent:', agentId)

    return NextResponse.json({
      success: true,
      phoneNumber: assignedNumber,
      phoneNumberClean: cleanPhone,
      sid: provisionedNumber.sid,
    })
  } catch (error: any) {
    console.error('[provision-phone] Unexpected error:', error?.message)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
