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

    // Update agent's onboarding step
    const { error } = await supabase
      .from('real_estate_agents')
      .update({ onboarding_step: step })
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
