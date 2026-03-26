import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db'
import { dismissNPSPrompt } from '@/lib/nps-service'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

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
    const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_API_URL || 'https://api.imagineapi.org',
  process.env.API_SECRET_KEY || process.env.NEXT_PUBLIC_API_KEY || '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: agent, error: agentError } = await supabaseServer
      .from('real_estate_agents')
      .select('id')
      .eq('id', agentId)
      .single()

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
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
