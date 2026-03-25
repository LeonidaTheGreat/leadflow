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

export async function POST(request: NextRequest) {
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

    const { fubConnected, smsConnected, simulatorCompleted } = await request.json()

    // Update agent's onboarding status
    const { error } = await supabase
      .from('real_estate_agents')
      .update({
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        onboarding_step: 'complete'
      })
      .eq('id', payload.userId)

    if (error) {
      console.error('Error completing setup:', error)
      return NextResponse.json(
        { error: 'Failed to complete setup' },
        { status: 500 }
      )
    }

    // Log onboarding_completed event
    try {
      await supabase.from('events').insert({
        agent_id: payload.userId,
        event_type: 'onboarding_completed',
        event_data: {
          fubConnected,
          smsConnected,
          simulatorCompleted
        },
        source: 'setup_wizard',
        created_at: new Date().toISOString()
      })
    } catch {
      // Non-blocking error logging
    }

    return NextResponse.json({
      success: true,
      message: 'Setup completed successfully'
    })

  } catch (error) {
    console.error('Setup complete error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
