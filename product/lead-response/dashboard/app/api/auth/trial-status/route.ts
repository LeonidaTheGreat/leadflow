import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db'
import jwt from 'jsonwebtoken'

const supabase = createClient(
  process.env.NEXT_PUBLIC_API_URL || 'https://api.imagineapi.org',
  process.env.API_SECRET_KEY || process.env.NEXT_PUBLIC_API_KEY || ''
)

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

interface JWTPayload {
  userId: string
  email: string
  name?: string
}

export async function GET(request: NextRequest) {
  try {
    // Get auth token from cookie
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Verify JWT token
    let payload: JWTPayload
    try {
      payload = jwt.verify(token, JWT_SECRET) as JWTPayload
    } catch {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Fetch agent's trial status
    const { data: agent, error } = await supabase
      .from('real_estate_agents')
      .select('plan_tier, trial_started_at, trial_ends_at, onboarding_completed, onboarding_step')
      .eq('id', payload.userId)
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

    // Calculate days remaining for pilot (60 days)
    const pilotExpiresAt = agent.trial_ends_at ? new Date(agent.trial_ends_at) : null
    const pilotDaysRemaining = pilotExpiresAt 
      ? Math.max(0, Math.ceil((pilotExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0

    return NextResponse.json({
      isTrial,
      isPilot,
      planTier: agent.plan_tier,
      trialStartedAt: agent.trial_started_at,
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
