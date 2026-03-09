import { NextRequest, NextResponse } from 'next/server'
import { dismissNPSPrompt, shouldShowNPSPrompt } from '@/lib/nps-service'

/**
 * POST /api/nps/dismiss
 * Dismiss NPS prompt
 */
export async function POST(request: NextRequest) {
  try {
    // Get agent ID from header (temporary auth approach)
    const agentId = request.headers.get('x-agent-id')
    if (!agentId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the current trigger type
    const status = await shouldShowNPSPrompt(agentId)
    if (!status.shouldShow || !status.trigger) {
      return NextResponse.json({ success: true })
    }

    await dismissNPSPrompt(agentId, status.trigger)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error dismissing NPS prompt:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
