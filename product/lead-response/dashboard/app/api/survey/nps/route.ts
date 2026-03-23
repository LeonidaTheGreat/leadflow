/**
 * POST /api/survey/nps
 * Submit NPS survey response (from email link or in-app)
 * feat-nps-agent-feedback
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  verifySurveyToken,
  hashToken,
  isTokenUsed,
  markTokenUsed,
  submitNPSResponse,
} from '@/lib/nps-service'
import { supabaseServer as supabase } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, score, openText, respondedVia = 'email' } = body

    // Validate required fields
    if (score === undefined || score === null) {
      return NextResponse.json(
        { success: false, error: 'Score is required' },
        { status: 400 }
      )
    }

    // Validate score range
    if (score < 0 || score > 10 || !Number.isInteger(score)) {
      return NextResponse.json(
        { success: false, error: 'Score must be an integer between 0 and 10' },
        { status: 400 }
      )
    }

    let agentId: string
    let trigger: 'auto_14d' | 'auto_90d' | 'manual'

    // If token provided, verify it (email submission)
    if (token) {
      const payload = verifySurveyToken(token)

      if (!payload) {
        return NextResponse.json(
          { success: false, error: 'Invalid or expired survey link' },
          { status: 401 }
        )
      }

      // Check for replay attack
      const tokenHash = hashToken(token)
      const used = await isTokenUsed(tokenHash)

      if (used) {
        return NextResponse.json(
          { success: false, error: 'This survey link has already been used' },
          { status: 409 }
        )
      }

      agentId = payload.agent_id
      trigger = payload.trigger

      // Mark token as used
      await markTokenUsed(tokenHash, agentId)
    } else {
      // In-app submission - require authentication
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

      agentId = agent.id
      trigger = 'manual'
    }

    // Submit the response
    const result = await submitNPSResponse(
      agentId,
      score,
      openText || null,
      trigger,
      respondedVia as 'email' | 'in_app',
      token ? hashToken(token) : undefined
    )

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you for your feedback!',
    })

  } catch (error: any) {
    console.error('Error submitting NPS response:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/survey/nps?token=...
 * Verify a survey token and return agent info
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      )
    }

    const payload = verifySurveyToken(token)

    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Check if token has been used
    const tokenHash = hashToken(token)
    const used = await isTokenUsed(tokenHash)

    if (used) {
      return NextResponse.json(
        { success: false, error: 'This survey has already been completed' },
        { status: 409 }
      )
    }

    // Get agent info
    const { data: agent, error } = await supabase
      .from('agents')
      .select('id, name, email')
      .eq('id', payload.agent_id)
      .single()

    if (error || !agent) {
      return NextResponse.json(
        { success: false, error: 'Agent not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        email: agent.email,
      },
      trigger: payload.trigger,
    })

  } catch (error: any) {
    console.error('Error verifying survey token:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
