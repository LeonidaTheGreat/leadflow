import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db'
import { validateSession } from '@/lib/session'
import { dismissNPSPrompt } from '@/lib/nps-service'

const supabase = createClient(
  process.env.NEXT_PUBLIC_API_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

/**
 * POST /api/nps/dismiss
 * Dismiss the NPS prompt for the authenticated agent
 * Body: { trigger: 'auto_14d' | 'auto_90d' }
 * Response: { success: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { trigger } = body

    if (!trigger || !['auto_14d', 'auto_90d'].includes(trigger)) {
      return NextResponse.json(
        { success: false, error: 'Valid trigger is required (auto_14d or auto_90d)' },
        { status: 400 }
      )
    }

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

    // Dismiss the prompt
    await dismissNPSPrompt(agent.id, trigger as 'auto_14d' | 'auto_90d')

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error dismissing NPS prompt:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
