import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { getAuthUserId } from '@/lib/auth'

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

    const { fubConnected, smsConnected, simulatorCompleted } = await request.json()

    // Update agent's onboarding status
    const { error } = await supabase
      .from('real_estate_agents')
      .update({
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        onboarding_step: 99 // 99 = complete
      })
      .eq('id', userId)

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
        agent_id: userId,
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
