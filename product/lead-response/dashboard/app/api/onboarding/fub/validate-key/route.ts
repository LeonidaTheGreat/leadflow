import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase, isSupabaseConfigured } from '@/lib/supabase-server'
import { getAuthUserId } from '@/lib/services/AuthService'
import crypto from 'crypto'

/**
 * POST /api/onboarding/fub/validate-key
 *
 * Validates a FUB API key against the live FUB API and stores it (SHA-256 hashed)
 * in the agent_onboarding_wizard table. Updates fub_onboarding_step to 1.
 *
 * Body: { apiKey: string }
 * Returns: { valid: boolean, error?: string, fubUser?: { name: string, email: string } }
 */
export async function POST(request: NextRequest) {
  const agentId = await getAuthUserId(request)
  if (!agentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let apiKey: string
  try {
    const body = await request.json()
    apiKey = (body.apiKey ?? '').trim()
  } catch {
    return NextResponse.json({ valid: false, error: 'Invalid request body' }, { status: 400 })
  }

  if (!apiKey) {
    return NextResponse.json({ valid: false, error: 'API key is required' }, { status: 400 })
  }

  if (apiKey.length < 20) {
    return NextResponse.json(
      { valid: false, error: 'Invalid API key format — FUB keys are at least 20 characters.' },
      { status: 400 }
    )
  }

  // Validate against live FUB API using Basic auth (key as username, blank password)
  let fubUser: { name: string; email: string } | null = null
  try {
    const fubResponse = await fetch('https://api.followupboss.com/v1/users', {
      method: 'GET',
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
        'X-System': 'LeadFlow AI',
        'X-System-Key': apiKey } })

    if (!fubResponse.ok) {
      if (fubResponse.status === 401) {
        return NextResponse.json(
          { valid: false, error: 'Invalid API key. Check Follow Up Boss → Admin → API.' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { valid: false, error: 'Could not reach Follow Up Boss. Please try again.' },
        { status: 502 }
      )
    }

    const fubData = await fubResponse.json()
    const firstUser = fubData.users?.[0]
    if (firstUser) {
      fubUser = { name: firstUser.name ?? '', email: firstUser.email ?? '' }
    }
  } catch {
    return NextResponse.json(
      { valid: false, error: 'Network error connecting to Follow Up Boss. Please try again.' },
      { status: 502 }
    )
  }

  // Hash API key before storing (SHA-256)
  const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex')

  // Store in agent_onboarding_wizard (raw key stored for webhook use; hashed for audit)
  if (isSupabaseConfigured()) {
    const now = new Date().toISOString()

    await supabase
      .from('agent_onboarding_wizard')
      .upsert(
        {
          agent_id: agentId,
          fub_api_key: hashedKey, // store only SHA-256 hash, never the raw key
          fub_connected: true,
          current_step: 'webhook',
          updated_at: now },
        { onConflict: 'agent_id' }
      )

    // Also update onboarding step on real_estate_agents
    await supabase
      .from('real_estate_agents')
      .update({ fub_onboarding_step: 1, updated_at: now })
      .eq('id', agentId)
  }

  return NextResponse.json({
    valid: true,
    fubUser })
}
