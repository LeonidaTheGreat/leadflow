import { NextRequest, NextResponse } from 'next/server'
import { shouldShowNPSPrompt, dismissNPSPrompt } from '@/lib/nps-service'
import { supabaseAdmin } from '@/lib/supabase'

// GET - Check if NPS prompt should be shown
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId is required' },
        { status: 400 }
      )
    }

    const result = await shouldShowNPSPrompt(agentId)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error checking NPS prompt:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Dismiss NPS prompt
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentId, trigger } = body

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId is required' },
        { status: 400 }
      )
    }

    if (!trigger || !['auto_14d', 'auto_90d'].includes(trigger)) {
      return NextResponse.json(
        { error: 'Valid trigger is required (auto_14d or auto_90d)' },
        { status: 400 }
      )
    }

    await dismissNPSPrompt(agentId, trigger)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error dismissing NPS prompt:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
