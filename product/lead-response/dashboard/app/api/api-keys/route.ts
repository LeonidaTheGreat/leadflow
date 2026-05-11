import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { validateSession } from '@/lib/services/AuthService'
import { canUseApi } from '@/lib/feature-gates'
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

// GET /api/api-keys — list API keys for the authenticated agent (Pro+)
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
  const gate = canUseApi(tier)
  if (!gate.allowed) {
    logger.warn(`API access gate blocked agent ${session.userId} (tier: ${tier})`)
    return NextResponse.json(
      { error: gate.message, requiredTier: gate.requiredTier, upgradeUrl: '/pricing' },
      { status: 403 }
    )
  }

  // Return placeholder — real key management would query an api_keys table
  return NextResponse.json({ keys: [], agentId: session.userId })
}

// POST /api/api-keys — create a new API key (Pro+)
export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get('leadflow_session')?.value
  if (!sessionToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const session = await validateSession(sessionToken)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tier = await getAgentTier(session.userId)
  const gate = canUseApi(tier)
  if (!gate.allowed) {
    logger.warn(`API access gate blocked agent ${session.userId} (tier: ${tier})`)
    return NextResponse.json(
      { error: gate.message, requiredTier: gate.requiredTier, upgradeUrl: '/pricing' },
      { status: 403 }
    )
  }

  const body = await request.json().catch(() => ({}))
  const { label } = body as { label?: string }
  if (!label || typeof label !== 'string' || label.trim().length === 0) {
    return NextResponse.json({ error: 'label is required' }, { status: 400 })
  }

  // Placeholder — real implementation would insert into an api_keys table
  return NextResponse.json(
    { message: 'API key created', agentId: session.userId, label: label.trim() },
    { status: 201 }
  )
}
