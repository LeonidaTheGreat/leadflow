import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server'
import { auth } from '@/lib/api-auth'

const onboardingTelemetry = require('@/lib/onboarding-telemetry')

export async function POST(request: NextRequest) {
  try {
    const { user } = await auth(request)

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized: Must be logged in' },
        { status: 401 }
      )
    }

    // user.id is the agent's UUID (real_estate_agents.id)
    const agentId = user.id

    const body = await request.json()
    const { step_name, status, metadata = {} } = body

    if (!step_name || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: step_name, status' },
        { status: 400 }
      )
    }

    const result = await onboardingTelemetry.logOnboardingEvent(
      supabase,
      agentId,
      step_name,
      status,
      {
        ...metadata,
        source: 'frontend',
        user_id: user.id,
        timestamp_client: new Date().toISOString(),
      }
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to log event' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        event: result.event,
        updateError: result.updateError || null,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[/api/onboarding/log-event] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
