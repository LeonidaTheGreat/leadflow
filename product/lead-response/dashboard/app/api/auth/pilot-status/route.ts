import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db'
import jwt from 'jsonwebtoken'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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

    // Fetch agent's pilot status
    const { data: agent, error } = await supabase
      .from('real_estate_agents')
      .select('plan_tier, pilot_started_at, pilot_expires_at')
      .eq('id', payload.userId)
      .single()

    if (error || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    // Check if agent is on pilot plan
    const isPilot = agent.plan_tier === 'pilot'

    if (!isPilot) {
      return NextResponse.json({
        isPilot: false,
        planTier: agent.plan_tier,
        pilotStartedAt: null,
        pilotExpiresAt: null,
        daysRemaining: 0,
        isExpired: false
      })
    }

    // Calculate days remaining
    const now = new Date()
    const expiresAt = agent.pilot_expires_at ? new Date(agent.pilot_expires_at) : null
    const isExpired = expiresAt ? now > expiresAt : false
    const daysRemaining = expiresAt 
      ? Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0

    return NextResponse.json({
      isPilot: true,
      planTier: agent.plan_tier,
      pilotStartedAt: agent.pilot_started_at,
      pilotExpiresAt: agent.pilot_expires_at,
      daysRemaining,
      isExpired
    })

  } catch (error) {
    console.error('Pilot status error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
