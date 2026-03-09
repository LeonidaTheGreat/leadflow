import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase, isSupabaseConfigured } from '@/lib/supabase-server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

function getAgentIdFromRequest(request: NextRequest): string | null {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  try {
    const token = auth.split(' ')[1]
    const payload = jwt.verify(token, JWT_SECRET) as { userId?: string }
    return payload.userId || null
  } catch {
    return null
  }
}

/**
 * POST /api/setup/complete
 * Marks the agent's onboarding as completed so the wizard won't re-appear.
 */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true })
  }

  const agentId = getAgentIdFromRequest(request)
  if (!agentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date().toISOString()

    // Mark agent row as onboarding complete
    const { error: agentError } = await supabase
      .from('real_estate_agents')
      .update({
        onboarding_completed: true,
        onboarding_completed_at: now,
      })
      .eq('id', agentId)

    if (agentError) {
      console.error('Setup complete — agent update error:', agentError)
    }

    // Also update wizard row
    const { error: wizardError } = await supabase
      .from('agent_onboarding_wizard')
      .upsert(
        {
          agent_id: agentId,
          completed_at: now,
          updated_at: now,
        },
        { onConflict: 'agent_id' }
      )

    if (wizardError) {
      console.error('Setup complete — wizard update error:', wizardError)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Setup complete error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
