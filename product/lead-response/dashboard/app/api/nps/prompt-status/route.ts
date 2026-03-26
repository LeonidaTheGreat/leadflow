import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { shouldShowNPSPrompt } from '@/lib/nps-service'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

/**
 * GET /api/nps/prompt-status
 * Check if the authenticated agent should see an NPS prompt on dashboard login
 * Returns { shouldShow: boolean, trigger?: 'auto_14d' | 'auto_90d' }
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate via JWT auth-token cookie
    const authToken = request.cookies.get('auth-token')?.value
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let payload: { userId?: string; id?: string } | null = null
    try {
      payload = jwt.verify(authToken, JWT_SECRET) as { userId?: string; id?: string }
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const agentId = payload.userId || payload.id
    if (!agentId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify agent exists
    const supabaseServer = supabaseAdmin

    const { data: agent, error: agentError } = await supabaseServer
      .from('real_estate_agents')
      .select('id')
      .eq('id', agentId)
      .single()

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Check if should show prompt
    const result = await shouldShowNPSPrompt(agent.id)

    return NextResponse.json({
      shouldShow: result.shouldShow,
      trigger: result.trigger || null,
    })
  } catch (error: any) {
    console.error('Error checking NPS prompt status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
