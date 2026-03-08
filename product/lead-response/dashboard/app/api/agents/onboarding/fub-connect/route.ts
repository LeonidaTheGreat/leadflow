import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase, isSupabaseConfigured } from '@/lib/supabase-server'
import { getAuthenticatedAgent } from '@/lib/onboarding-auth'

/**
 * POST /api/agents/onboarding/fub-connect
 * Validates FUB API key against live FUB API, registers webhook, and
 * stores credentials in agent_integrations. Updates fub_connected + onboarding_step.
 *
 * Body: { apiKey: string }
 */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const agentId = await getAuthenticatedAgent(request)
  if (!agentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let apiKey: string
  try {
    const body = await request.json()
    apiKey = body.apiKey?.trim()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!apiKey) {
    return NextResponse.json({ error: 'API key is required' }, { status: 400 })
  }

  if (apiKey.length < 20) {
    return NextResponse.json(
      { valid: false, message: 'Invalid API key format — FUB keys are at least 20 characters.' },
      { status: 400 }
    )
  }

  // Validate against live FUB API
  let fubUser: Record<string, unknown> | null = null
  try {
    const fubResponse = await fetch('https://api.followupboss.com/v1/users', {
      method: 'GET',
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
        'X-System': 'LeadFlow AI',
        'X-System-Key': apiKey,
      },
    })

    if (!fubResponse.ok) {
      if (fubResponse.status === 401) {
        return NextResponse.json(
          { valid: false, message: 'Invalid API key. Check your Follow Up Boss account settings.' },
          { status: 401 }
        )
      }
      return NextResponse.json(
        { valid: false, message: 'Could not reach Follow Up Boss. Please try again.' },
        { status: 502 }
      )
    }

    const fubData = await fubResponse.json()
    fubUser = fubData.users?.[0] ?? null
  } catch {
    return NextResponse.json(
      { valid: false, message: 'Network error connecting to Follow Up Boss.' },
      { status: 502 }
    )
  }

  // Register LeadFlow webhook in FUB (best-effort — don't fail if this fails)
  const webhookBaseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://leadflow-ai-five.vercel.app'

  try {
    await fetch('https://api.followupboss.com/v1/webhooks', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: `${webhookBaseUrl}/api/webhooks/fub`,
        event: 'peopleCreated',
      }),
    })
  } catch {
    // Webhook registration is best-effort; don't fail the whole connect
    console.warn('FUB webhook registration failed (non-fatal)')
  }

  // Store API key in agent_integrations
  const { error: intError } = await supabase.from('agent_integrations').upsert(
    {
      agent_id: agentId,
      fub_api_key: apiKey,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'agent_id' }
  )

  if (intError) {
    console.error('Failed to store FUB API key:', intError)
    return NextResponse.json({ error: 'Failed to save credentials' }, { status: 500 })
  }

  // Update agent onboarding state
  const { error: agentError } = await supabase
    .from('real_estate_agents')
    .update({
      fub_connected: true,
      onboarding_step: 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', agentId)

  if (agentError) {
    console.error('Failed to update agent onboarding state:', agentError)
    return NextResponse.json({ error: 'Failed to update onboarding state' }, { status: 500 })
  }

  return NextResponse.json({
    valid: true,
    message: 'Follow Up Boss connected successfully!',
    fubUser: fubUser ? { name: (fubUser as any).name, email: (fubUser as any).email } : null,
  })
}
