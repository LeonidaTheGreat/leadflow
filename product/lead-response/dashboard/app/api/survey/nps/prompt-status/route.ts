/**
 * GET /api/survey/nps/prompt-status
 * Check if agent should see NPS prompt
 * feat-nps-agent-feedback
 */

import { NextRequest, NextResponse } from 'next/server'
import { shouldShowNPSPrompt } from '@/lib/nps-service'
import { supabaseServer as supabase } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    // Get authenticated agent
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const sessionToken = authHeader.substring(7)
    
    // Verify session with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(sessionToken)
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      )
    }

    // Get agent ID from user
    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('email', user.email)
      .single()

    if (!agent) {
      return NextResponse.json(
        { success: false, error: 'Agent not found' },
        { status: 404 }
      )
    }

    // Check if should show prompt
    const result = await shouldShowNPSPrompt(agent.id)

    return NextResponse.json({
      success: true,
      shouldShow: result.shouldShow,
      trigger: result.trigger,
    })

  } catch (error: any) {
    console.error('Error checking NPS prompt status:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
