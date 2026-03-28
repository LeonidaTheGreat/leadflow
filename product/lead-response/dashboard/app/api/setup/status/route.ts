import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase, isSupabaseConfigured } from '@/lib/supabase-server'
import { getAuthUserId } from '@/lib/auth'

const onboardingTelemetry = require('@/lib/onboarding-telemetry')

/**
 * GET /api/setup/status
 * Returns the current wizard state for the authenticated agent.
 */
export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ wizardState: null })
  }

  const agentId = await getAuthUserId(request)
  if (!agentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data, error } = await supabase
      .from('agent_onboarding_wizard')
      .select('*')
      .eq('agent_id', agentId)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = row not found — that's fine for new agents
      console.error('Setup status fetch error:', error)
      return NextResponse.json({ wizardState: null })
    }

    return NextResponse.json({ wizardState: data || null })
  } catch (err) {
    console.error('Setup status error:', err)
    return NextResponse.json({ wizardState: null })
  }
}

/**
 * POST /api/setup/status
 * Persists partial wizard state for the authenticated agent.
 */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true })
  }

  const agentId = await getAuthUserId(request)
  if (!agentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Map camelCase state fields to snake_case DB columns
  const patch: Record<string, unknown> = {
    agent_id: agentId,
    updated_at: new Date().toISOString(),
  }

  if (body.fubConnected !== undefined) patch.fub_connected = body.fubConnected
  if (body.fubApiKey !== undefined) patch.fub_api_key = body.fubApiKey
  if (body.twilioConnected !== undefined) patch.twilio_connected = body.twilioConnected
  if (body.twilioPhone !== undefined) patch.twilio_phone = body.twilioPhone
  if (body.smsVerified !== undefined) patch.sms_verified = body.smsVerified
  if (body.simulatorCompleted !== undefined) patch.simulator_completed = body.simulatorCompleted
  if (body.simulatorResponseTimeMs !== undefined) patch.simulator_response_time_ms = body.simulatorResponseTimeMs
  if (body.simulatorSkipped !== undefined) patch.simulator_skipped = body.simulatorSkipped
  if (body.currentStep !== undefined) patch.current_step = body.currentStep

  try {
    const { error } = await supabase
      .from('agent_onboarding_wizard')
      .upsert(patch, { onConflict: 'agent_id' })

    if (error) {
      console.error('Setup status save error:', error)
      // Non-fatal — return success so client continues
    }

    // Log telemetry events for step completions
    if (body.fubConnected === true) {
      await onboardingTelemetry.logOnboardingEvent(
        supabase,
        agentId,
        'fub_connected',
        'completed',
        { source: '/api/setup/status' }
      )
    }
    if (body.twilioConnected === true) {
      await onboardingTelemetry.logOnboardingEvent(
        supabase,
        agentId,
        'phone_configured',
        'completed',
        { source: '/api/setup/status' }
      )
    }
    if (body.smsVerified === true) {
      await onboardingTelemetry.logOnboardingEvent(
        supabase,
        agentId,
        'sms_verified',
        'completed',
        { source: '/api/setup/status' }
      )
    }
    if (body.simulatorCompleted === true) {
      await onboardingTelemetry.logOnboardingEvent(
        supabase,
        agentId,
        'aha_completed',
        'completed',
        { source: '/api/setup/status', simulator_time_ms: body.simulatorResponseTimeMs }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Setup status upsert error:', err)
    return NextResponse.json({ ok: true }) // Non-fatal
  }
}
