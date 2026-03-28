import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db'
import {
  verifySurveyToken,
  hashToken,
  isTokenUsed,
  markTokenUsed,
  submitNPSResponse,
} from '@/lib/nps-service'
import { supabaseServer } from '@/lib/supabase-server'
import { getAuthUserId } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, score, openText } = body

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
    let trigger: 'auto_14d' | 'auto_90d' | 'manual' = 'manual'
    let tokenHash: string | undefined

    // If token is provided (not 'in-app-token'), verify it (email-based submission)
    if (token && token !== 'in-app-token') {
      const payload = verifySurveyToken(token)
      if (!payload) {
        return NextResponse.json(
          { success: false, error: 'Invalid or expired token' },
          { status: 400 }
        )
      }

      // Check if token has already been used
      const hashed = hashToken(token)
      const used = await isTokenUsed(hashed)
      if (used) {
        return NextResponse.json(
          { success: false, error: 'Survey has already been submitted' },
          { status: 400 }
        )
      }

      // Mark token as used
      await markTokenUsed(hashed, payload.agent_id)

      agentId = payload.agent_id
      trigger = payload.trigger
      tokenHash = hashed

      // Submit the NPS response
      const result = await submitNPSResponse(
        agentId,
        score,
        openText || null,
        trigger,
        'email',
        tokenHash
      )

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true })
    } else {
      // In-app submission - requires authenticated cookie (JWT or session)
      const resolvedAgentId = await getAuthUserId(request)
      if (!resolvedAgentId) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        )
      }

      // Verify agent exists
      const { data: agent, error: agentError } = await supabaseServer
        .from('real_estate_agents')
        .select('id')
        .eq('id', resolvedAgentId)
        .single()

      if (agentError || !agent) {
        return NextResponse.json(
          { success: false, error: 'Agent not found' },
          { status: 404 }
        )
      }

      agentId = agent.id

      // Submit the NPS response (in-app submission, no token)
      const result = await submitNPSResponse(
        agentId,
        score,
        openText || null,
        trigger,
        'in_app'
      )

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true })
    }
  } catch (error: any) {
    console.error('Error submitting NPS response:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
