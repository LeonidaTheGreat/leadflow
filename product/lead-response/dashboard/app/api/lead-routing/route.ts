import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { validateSession } from '@/lib/services/AuthService'
import { canUseLeadRouting } from '@/lib/feature-gates'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

async function getAgentTier(agentId: string): Promise<string> {
  try {
    const { data } = await supabaseServer
      .from('real_estate_agents')
      .select('plan_tier')
      .eq('id', agentId)
      .limit(1)
      .single()
    return (data as any)?.plan_tier ?? 'starter'
  } catch {
    return 'starter'
  }
}

// GET /api/lead-routing — retrieve lead routing configuration (Team+)
export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get('leadflow_session')?.value
  if (!sessionToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const session = await validateSession(sessionToken)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tier = await getAgentTier(session.userId)
  const gate = canUseLeadRouting(tier)
  if (!gate.allowed) {
    logger.warn(`Lead routing gate blocked agent ${session.userId} (tier: ${tier})`)
    return NextResponse.json(
      { error: gate.message, requiredTier: gate.requiredTier, upgradeUrl: '/pricing' },
      { status: 403 }
    )
  }

  return NextResponse.json({ enabled: true, agentId: session.userId })
}
