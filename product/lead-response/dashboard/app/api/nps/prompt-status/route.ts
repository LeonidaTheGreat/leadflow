import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { shouldShowNPSPrompt } from '@/lib/nps-service'
import { getAuthUserId } from '@/lib/auth'

/**
 * GET /api/nps/prompt-status
 * Check if the authenticated agent should see an NPS prompt on dashboard login
 * Returns { shouldShow: boolean, trigger?: 'auto_14d' | 'auto_90d' }
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate via auth-token or leadflow_session cookie
    const agentId = await getAuthUserId(request)
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
