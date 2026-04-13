import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase, isSupabaseConfigured } from '@/lib/supabase-server'
import { getAuthUserId } from '@/lib/services/AuthService'
import twilio from 'twilio'

/**
 * POST /api/agents/onboarding/provision-phone
 *
 * Provisions a real Twilio phone number from LeadFlow's account and assigns
 * it to the agent. Called when the agent selects "Use LeadFlow Number" in
 * the Setup Wizard (Step 2).
 *
 * Assignment order:
 *   1. Return existing number if agent already has one.
 *   2. Assign from the pre-purchased phone_inventory pool (instant, no Twilio API call).
 *   3. Fall through to on-demand Twilio search + purchase only if the pool is empty.
 *
 * Body params:
 *   areaCode?: string   - optional 3-digit US area code to search near
 *
 * Returns:
 *   { success: true, phoneNumber: "+15551234567" }
 *   { success: false, error: "...", retryable?: true }
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

    // FIRST: Check if this agent already has a provisioned number — return it immediately
    const { data: existingIntegration, error: integrationError } = await supabase
      .from('agent_integrations')
      .select('twilio_phone_e164, twilio_phone_number, twilio_phone_sid')
      .eq('agent_id', agentId)
      .single()

    if (!integrationError && existingIntegration) {
      const existingE164 = existingIntegration.twilio_phone_e164
      const existingRaw = existingIntegration.twilio_phone_number

      if (existingE164) {
        console.log('[provision-phone] Agent already has number:', existingE164, 'for agent:', agentId)
        const cleanPhone = existingE164.replace(/^\+1/, '').replace(/\D/g, '')
        return NextResponse.json({
          success: true,
          phoneNumber: existingE164,
          phoneNumberClean: cleanPhone,
          sid: existingIntegration.twilio_phone_sid ?? undefined,
          alreadyProvisioned: true,
        })
      }

      if (existingRaw) {
        const digits = existingRaw.replace(/\D/g, '')
        const e164 = `+1${digits}`
        console.log('[provision-phone] Agent already has number (raw):', e164, 'for agent:', agentId)
        return NextResponse.json({
          success: true,
          phoneNumber: e164,
          phoneNumberClean: digits,
          alreadyProvisioned: true,
        })
      }
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

    // SECOND: Try to assign from the pre-purchased phone_inventory pool.
    // If an area code was requested, prefer a matching number; fall back to any available.
    type PoolRow = { id: number; sid: string; e164: string; area_code: string | null; country: string }
    let poolNumber: PoolRow | null = null

    if (areaCode) {
      const { data: areaMatch } = await supabase
        .from('phone_inventory')
        .select('id, sid, e164, area_code, country')
        .eq('status', 'available')
        .eq('area_code', areaCode)
        .order('created_at', { ascending: true })
        .limit(1)
      const row = Array.isArray(areaMatch) ? areaMatch[0] : areaMatch
      if (row?.e164) poolNumber = row as PoolRow
    }

    if (!poolNumber) {
      const { data: anyAvailable } = await supabase
        .from('phone_inventory')
        .select('id, sid, e164, area_code, country')
        .eq('status', 'available')
        .order('created_at', { ascending: true })
        .limit(1)
      const row = Array.isArray(anyAvailable) ? anyAvailable[0] : anyAvailable
      if (row?.e164) poolNumber = row as PoolRow
    }

    if (poolNumber?.e164 && poolNumber?.sid) {
      console.log('[provision-phone] Assigning from pool:', poolNumber.e164, 'for agent:', agentId)

      // Configure the Twilio number's smsUrl so inbound SMS is routed correctly
      const smsWebhookUrl = process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/twilio`
        : undefined
      if (smsWebhookUrl) {
        try {
          const poolClient = twilio(accountSid, authToken)
          await poolClient.incomingPhoneNumbers(poolNumber.sid).update({
            smsUrl: smsWebhookUrl,
            smsMethod: 'POST',
          })
        } catch (updateErr: any) {
          console.warn('[provision-phone] Could not set smsUrl on pool number:', updateErr?.message)
          // Non-fatal — number still assigned, smsUrl can be configured later
        }
      }

      // Mark number as assigned in the pool
      const { error: poolUpdateError } = await supabase
        .from('phone_inventory')
        .update({ status: 'assigned', assigned_to: agentId, assigned_at: new Date().toISOString() })
        .eq('id', poolNumber.id)

      if (poolUpdateError) {
        // Pool update failed — log and fall through to on-demand purchase
        console.error('[provision-phone] Pool update error, falling through to Twilio:', poolUpdateError)
      } else {
        const cleanPhone = poolNumber.e164.replace(/^\+1/, '').replace(/\D/g, '')

        // Record the number in agent_integrations
        const { error: dbError } = await supabase
          .from('agent_integrations')
          .upsert(
            {
              agent_id: agentId,
              twilio_phone_number: cleanPhone,
              twilio_phone_sid: poolNumber.sid,
              twilio_phone_e164: poolNumber.e164,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'agent_id' }
          )

        if (dbError) {
          console.error('[provision-phone] DB error writing pool number to agent_integrations:', dbError)
          // Revert pool assignment so the number stays available for the next attempt
          await supabase
            .from('phone_inventory')
            .update({ status: 'available', assigned_to: null, assigned_at: null })
            .eq('id', poolNumber.id)
          return NextResponse.json(
            { success: false, error: 'Phone number assigned but could not be saved. Please try again.' },
            { status: 500 }
          )
        }

        // Enable SMS in agent settings
        await supabase
          .from('agent_settings')
          .upsert(
            { agent_id: agentId, sms_enabled: true, updated_at: new Date().toISOString() },
            { onConflict: 'agent_id' }
          )

        // Update agent onboarding state
        await supabase
          .from('real_estate_agents')
          .update({ phone_configured: true, onboarding_step: 2, updated_at: new Date().toISOString() })
          .eq('id', agentId)

        console.log('[provision-phone] Assigned from pool:', poolNumber.e164, 'for agent:', agentId)
        return NextResponse.json({
          success: true,
          phoneNumber: poolNumber.e164,
          phoneNumberClean: cleanPhone,
          sid: poolNumber.sid,
          fromPool: true,
        })
      }
    }

    // THIRD: Pool is empty (or pool update failed) — fall through to on-demand Twilio
    console.log('[provision-phone] Pool empty or unavailable, falling through to on-demand Twilio for agent:', agentId)

    // Search for an available US local number
    const client = twilio(accountSid, authToken)

    const searchParams: Record<string, string | boolean> = {
      smsEnabled: true,
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
            .local.list({ smsEnabled: true, limit: 5 })
        } catch (twilioError: any) {
          console.error('[provision-phone] Twilio fallback search error:', twilioError?.message)
          return NextResponse.json(
            { success: false, error: 'Failed to find available phone numbers' },
            { status: 502 }
          )
        }
      }
    }

    // FOURTH: CA (Canadian) fallback — if US search still empty, try Canada
    if (!availableNumbers || availableNumbers.length === 0) {
      console.log('[provision-phone] No US numbers found, trying CA fallback for agent:', agentId)
      try {
        availableNumbers = await client.availablePhoneNumbers('CA')
          .local.list({ smsEnabled: true, limit: 5 })
      } catch (twilioError: any) {
        console.error('[provision-phone] Twilio CA fallback search error:', twilioError?.message)
        // CA search failed — fall through to the final "no numbers" error below
      }
    }

    // FIFTH: All searches exhausted — return a helpful, retryable error
    if (!availableNumbers || availableNumbers.length === 0) {
      console.warn('[provision-phone] No numbers available (US + CA exhausted) for agent:', agentId)
      return NextResponse.json(
        {
          success: false,
          error: 'no_numbers_available',
          message: 'No numbers available right now. Please try again in a few minutes, or bring your own Twilio number.',
          retryable: true,
        },
        { status: 503 }
      )
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
