import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase, isSupabaseConfigured } from '@/lib/supabase-server'
import { getAuthUserId } from '@/lib/services/AuthService'

/**
 * GET /api/onboarding/fub/status
 *
 * Returns the current FUB onboarding status for the authenticated agent.
 * Used by the wizard page to redirect agents who have already completed setup.
 *
 * Returns: { fub_onboarding_completed: boolean, fub_onboarding_step: number }
 */
export async function GET(request: NextRequest) {
  const agentId = await getAuthUserId(request)
  if (!agentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ fub_onboarding_completed: false, fub_onboarding_step: 0 })
  }

  const { data, error } = await supabase
    .from('real_estate_agents')
    .select('fub_onboarding_completed, fub_onboarding_step')
    .eq('id', agentId)
    .single()

  if (error || !data) {
    return NextResponse.json({ fub_onboarding_completed: false, fub_onboarding_step: 0 })
  }

  return NextResponse.json({
    fub_onboarding_completed: data.fub_onboarding_completed ?? false,
    fub_onboarding_step: data.fub_onboarding_step ?? 0,
  })
}
