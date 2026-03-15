import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const onboardingTelemetry = require('../../../../../lib/onboarding-telemetry')

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized: Must be logged in' },
        { status: 401 }
      )
    }

    let agentId = user.user_metadata?.agent_id

    if (!agentId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('agent_id')
        .eq('user_id', user.id)
        .single()

      agentId = profile?.agent_id
    }

    if (!agentId) {
      return NextResponse.json(
        { error: 'Unable to determine agent_id for user' },
        { status: 400 }
      )
    }

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
