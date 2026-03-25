import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db'
import { validateSession } from '@/lib/session'
import { shouldShowNPSPrompt } from '@/lib/nps-service'

const supabase = createClient(
  process.env.NEXT_PUBLIC_API_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

/**
 * GET /api/nps/prompt-status
 * Check if the authenticated agent should see an NPS prompt on dashboard login
 * Returns { shouldShow: boolean, trigger?: 'auto_14d' | 'auto_90d' }
 */
export async function GET(request: NextRequest) {
  try {
    // Get the authenticated agent's ID from the session cookie
    const sessionToken = request.cookies.get('leadflow_session')?.value

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const session = await validateSession(sessionToken)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the agent record by user ID
    const { data: agent, error: agentError } = await supabase
      .from('real_estate_agents')
      .select('id')
      .eq('id', session.userId)
      .single()

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
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
