import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase, isSupabaseConfigured } from '@/lib/supabase-server'
import { getAuthUserId } from '@/lib/services/AuthService'

/**
 * POST /api/onboarding/fub/complete
 *
 * Marks the FUB onboarding wizard as complete for the authenticated agent.
 * Sets agents.fub_onboarding_completed = true and fub_onboarding_step = 4.
 *
 * Returns: { ok: boolean }
 */
export async function POST(request: NextRequest) {
  const agentId = await getAuthUserId(request)
  if (!agentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true })
  }

  const now = new Date().toISOString()

  const { error } = await supabase
    .from('real_estate_agents')
    .update({
      fub_onboarding_completed: true,
      fub_onboarding_step: 4,
      updated_at: now,
    })
    .eq('id', agentId)

  if (error) {
    console.error('Failed to mark FUB onboarding complete:', error)
    return NextResponse.json({ error: 'Failed to update onboarding state' }, { status: 500 })
  }

  // Also mark wizard as complete in agent_onboarding_wizard table
  await supabase
    .from('agent_onboarding_wizard')
    .upsert(
      {
        agent_id: agentId,
        completed_at: now,
        current_step: 'complete',
        updated_at: now,
      },
      { onConflict: 'agent_id' }
    )

  return NextResponse.json({ ok: true })
}
