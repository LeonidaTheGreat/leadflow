import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { getAuthUserId } from '@/lib/auth'

const supabase = supabaseAdmin

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user ID using unified auth helper
    const userId = await getAuthUserId(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Fetch agent's trial status
    const { data: agent, error } = await supabase
      .from('real_estate_agents')
      .select('plan_tier, trial_ends_at, pilot_started_at, pilot_expires_at, onboarding_completed, onboarding_step')
      .eq('id', userId)
      .single()

    if (error || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    // Check if agent is on trial plan
    const isTrial = agent.plan_tier === 'trial'
    const isPilot = agent.plan_tier === 'pilot'

    // Calculate days remaining for trial
    const now = new Date()
    const trialEndsAt = agent.trial_ends_at ? new Date(agent.trial_ends_at) : null
    const isExpired = trialEndsAt ? now > trialEndsAt : false
    const daysRemaining = trialEndsAt 
      ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0

    // Calculate days remaining for pilot
    const pilotExpiresAt = agent.pilot_expires_at ? new Date(agent.pilot_expires_at) : null
    const pilotDaysRemaining = pilotExpiresAt
      ? Math.max(0, Math.ceil((pilotExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0

    return NextResponse.json({
      agentId: userId,
      isTrial,
      isPilot,
      planTier: agent.plan_tier,
      trialStartedAt: agent.pilot_started_at,
      trialEndsAt: agent.trial_ends_at,
      daysRemaining: isTrial ? daysRemaining : pilotDaysRemaining,
      isExpired,
      onboardingCompleted: agent.onboarding_completed,
      onboardingStep: agent.onboarding_step
    })

  } catch (error) {
    console.error('Trial status error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
