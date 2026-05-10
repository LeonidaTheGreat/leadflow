import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { getAuthUserId } from '@/lib/services/AuthService'
import { logger } from '@/lib/logger'

const supabase = supabaseAdmin

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { step } = await request.json()

    if (!step) {
      return NextResponse.json(
        { error: 'Step is required' },
        { status: 400 }
      )
    }

    const stepMap: Record<string, number> = {
      welcome: 1, 'try-ai': 2, 'agent-info': 3, calendar: 4,
      sms: 5, simulator: 6, confirmation: 7, fub: 1, complete: 99,
    }
    const stepNum = typeof step === 'number' ? step : (stepMap[step] ?? 0)

    // Update agent's onboarding step
    const { error } = await supabase
      .from('real_estate_agents')
      .update({ onboarding_step: stepNum })
      .eq('id', userId)

    if (error) {
      logger.error('Error updating onboarding step:', error)
      return NextResponse.json(
        { error: 'Failed to save progress' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    logger.error('Setup progress error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
