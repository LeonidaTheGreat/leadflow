/**
 * POST /api/agents/onboarding/fub-connect
 * Validates the FUB API key, registers the LeadFlow webhook in FUB,
 * and marks fub_connected = true on the agent record.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server'
import { getAgentId } from '@/lib/jwt-auth'

const FUB_WEBHOOK_URL =
  process.env.LEADFLOW_WEBHOOK_URL ||
  'https://fub-inbound-webhook.vercel.app/api/webhook/fub'

export async function POST(request: NextRequest) {
  const agentId = getAgentId(request)
  if (!agentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { apiKey } = await request.json().catch(() => ({}))

  if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 20) {
    return NextResponse.json(
      { error: 'A valid FUB API key is required (minimum 20 characters)' },
      { status: 400 }
    )
  }

  // --- 1. Validate key with FUB API ---
  let fubUser: { id?: number; email?: string } | null = null
  try {
    const fubRes = await fetch('https://api.followupboss.com/v1/users', {
      method: 'GET',
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey.trim()}:`).toString('base64')}`,
        'Content-Type': 'application/json',
        'X-System': 'LeadFlow AI',
        'X-System-Key': apiKey.trim(),
      },
    })

    if (fubRes.status === 401) {
      return NextResponse.json(
        { error: 'Invalid FUB API key. Please check your credentials.' },
        { status: 400 }
      )
    }

    if (!fubRes.ok) {
      return NextResponse.json(
        { error: 'Could not reach Follow Up Boss. Please try again.' },
        { status: 502 }
      )
    }

    const fubData = await fubRes.json()
    fubUser = fubData.users?.[0] ?? null
  } catch (err) {
    console.error('FUB validation error:', err)
    return NextResponse.json(
      { error: 'Failed to connect to Follow Up Boss. Check your network and try again.' },
      { status: 502 }
    )
  }

  // --- 2. Register webhook in FUB ---
  let webhookRegistered = false
  try {
    const webhookRes = await fetch('https://api.followupboss.com/v1/webhooks', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey.trim()}:`).toString('base64')}`,
        'Content-Type': 'application/json',
        'X-System': 'LeadFlow AI',
        'X-System-Key': apiKey.trim(),
      },
      body: JSON.stringify({
        url: FUB_WEBHOOK_URL,
        event: 'peopleCreated',
      }),
    })
    // 200/201 = created, 409 = already exists (both OK)
    webhookRegistered = webhookRes.ok || webhookRes.status === 409
  } catch (err) {
    // Webhook registration is best-effort — don't fail the whole step
    console.warn('FUB webhook registration failed (non-fatal):', err)
  }

  // --- 3. Persist to Supabase ---
  const { error: upsertError } = await supabase.from('agent_integrations').upsert(
    { agent_id: agentId, fub_api_key: apiKey.trim() },
    { onConflict: 'agent_id' }
  )
  if (upsertError) {
    console.error('agent_integrations upsert error:', upsertError)
    return NextResponse.json({ error: 'Failed to save FUB credentials' }, { status: 500 })
  }

  const { error: agentError } = await supabase
    .from('real_estate_agents')
    .update({ fub_connected: true, onboarding_step: 1 })
    .eq('id', agentId)

  if (agentError) {
    console.error('Agent update error:', agentError)
    return NextResponse.json({ error: 'Failed to update agent record' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: 'Follow Up Boss connected successfully',
    webhookRegistered,
    fubUser: fubUser ? { email: fubUser.email } : null,
  })
}
