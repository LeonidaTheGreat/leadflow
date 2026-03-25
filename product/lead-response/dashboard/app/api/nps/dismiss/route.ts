import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { dismissNPSPrompt } from '@/lib/nps-service'

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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // Get session from cookies
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Get the agent record by user ID
    const supabaseServer = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY || '', {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: agent, error: agentError } = await supabaseServer
      .from('real_estate_agents')
      .select('id')
      .eq('user_id', userId)
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
