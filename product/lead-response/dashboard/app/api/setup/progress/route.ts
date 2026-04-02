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

    const { step } = await request.json()

    if (!step) {
      return NextResponse.json(
        { error: 'Step is required' },
        { status: 400 }
      )
    }

    // Map step name to integer (DB column is integer, frontend sends string)
    const stepMap: Record<string, number> = { fub: 1, sms: 2, simulator: 3, complete: 4 }
    const stepNum = typeof step === 'number' ? step : (stepMap[step] ?? 0)

    // Update agent's onboarding step
    const { error } = await supabase
      .from('real_estate_agents')
      .update({ onboarding_step: stepNum })
      .eq('id', userId)

    if (error) {
      console.error('Error updating onboarding step:', error)
      return NextResponse.json(
        { error: 'Failed to save progress' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Setup progress error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
