import { NextRequest, NextResponse } from 'next/server'
import {
  verifySurveyToken,
  hashToken,
  isTokenUsed,
} from '@/lib/nps-service'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Token is required' },
        { status: 400 }
      )
    }

    // Verify the JWT token
    const payload = verifySurveyToken(token)
    if (!payload) {
      return NextResponse.json(
        { valid: false, error: 'Invalid or expired token' },
        { status: 400 }
      )
    }

    // Check if token has already been used
    const tokenHash = hashToken(token)
    const used = await isTokenUsed(tokenHash)
    if (used) {
      return NextResponse.json({
        valid: true,
        alreadyResponded: true,
        agent: null,
      })
    }

    // Get agent info
    const { data: agent, error } = await supabaseServer
      .from('real_estate_agents')
      .select('id, first_name, last_name, email')
      .eq('id', payload.agent_id)
      .single()

    if (error || !agent) {
      return NextResponse.json(
        { valid: false, error: 'Agent not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      valid: true,
      alreadyResponded: false,
      agent: {
        id: agent.id,
        name: `${agent.first_name} ${agent.last_name}`,
        email: agent.email,
      },
      trigger: payload.trigger,
    })
  } catch (error: any) {
    console.error('Error verifying NPS token:', error)
    return NextResponse.json(
      { valid: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
