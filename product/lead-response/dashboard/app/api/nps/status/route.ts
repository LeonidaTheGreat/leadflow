import { NextRequest, NextResponse } from 'next/server'
import { shouldShowNPSPrompt } from '@/lib/nps-service'

/**
 * GET /api/nps/status
 * Check if NPS prompt should be shown for current user
 */
export async function GET(request: NextRequest) {
  try {
    // Get agent ID from header (temporary auth approach)
    const agentId = request.headers.get('x-agent-id')
    if (!agentId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await shouldShowNPSPrompt(agentId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error checking NPS status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
