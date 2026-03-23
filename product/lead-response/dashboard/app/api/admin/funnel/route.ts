import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server'
import { auth } from '@/lib/api-auth'

const onboardingTelemetry = require('@/lib/onboarding-telemetry')

export async function GET(request: NextRequest) {
  try {
    const { user } = await auth(request)

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized: Must be logged in' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const view = searchParams.get('view') || 'status'

    const result: any = {}

    if (view === 'status' || view === 'all') {
      const statusResult = await onboardingTelemetry.getFunnelStatus(supabase)
      if (statusResult.success) {
        result.status = {
          agents: statusResult.agents,
          total: statusResult.agents.length,
          by_step: {},
          stuck_count: 0,
        }

        for (const agent of statusResult.agents) {
          const step = agent.onboarding_step || 0
          if (!result.status.by_step[step]) {
            result.status.by_step[step] = {
              count: 0,
              step_name: getStepName(step),
            }
          }
          result.status.by_step[step].count += 1

          if (agent.is_stuck) {
            result.status.stuck_count += 1
          }
        }

        result.status.stuck_agents = statusResult.agents.filter((a: any) => a.is_stuck)
      } else {
        result.status = { error: statusResult.error }
      }
    }

    if (view === 'conversions' || view === 'all') {
      const conversionResult = await onboardingTelemetry.getFunnelConversions(supabase)
      if (conversionResult.success) {
        result.conversions = conversionResult.conversions
      } else {
        result.conversions = { error: conversionResult.error }
      }
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    console.error('[/api/admin/funnel] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

function getStepName(stepIndex: number): string {
  const names: Record<number, string> = {
    0: 'signup_created',
    1: 'email_verified',
    2: 'fub_connected',
    3: 'phone_configured',
    4: 'sms_verified',
    5: 'aha_completed',
  }
  return names[stepIndex] || `unknown_${stepIndex}`
}
