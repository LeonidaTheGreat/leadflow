import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { shouldShowNPSPrompt } from '@/lib/nps-service'

/**
 * GET /api/nps/prompt-status
 * Check if the authenticated agent should see an NPS prompt on dashboard login
 * Returns { shouldShow: boolean, trigger?: 'auto_14d' | 'auto_90d' }
 */
export async function GET(request: NextRequest) {
  try {
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
