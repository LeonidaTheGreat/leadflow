import { NextRequest, NextResponse } from 'next/server'
import { submitNPSResponse } from '@/lib/nps-service'

/**
 * POST /api/nps/submit
 * Submit NPS response from dashboard
 */
export async function POST(request: NextRequest) {
  try {
    // Get agent ID from header (temporary auth approach)
    const agentId = request.headers.get('x-agent-id')
    if (!agentId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { score, feedback } = body

    if (score === undefined || score === null) {
      return NextResponse.json(
        { error: 'Score is required' },
        { status: 400 }
      )
    }

    if (score < 0 || score > 10) {
      return NextResponse.json(
        { error: 'Score must be between 0 and 10' },
        { status: 400 }
      )
    }

    const result = await submitNPSResponse(
      agentId,
      score,
      feedback || null,
      'manual',
      'in_app'
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to submit NPS' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error submitting NPS:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
