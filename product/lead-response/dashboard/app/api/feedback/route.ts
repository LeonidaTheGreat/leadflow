import { NextRequest, NextResponse } from 'next/server'
import { submitProductFeedback } from '@/lib/nps-service'

/**
 * POST /api/feedback
 * Submit product feedback from dashboard
 */
export async function POST(request: NextRequest) {
  try {
    // Get agent ID from header (temporary auth approach)
    const agentId = request.headers.get('x-agent-id')
    if (!agentId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { feedbackType, content } = body

    if (!feedbackType || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const result = await submitProductFeedback(
      agentId,
      feedbackType,
      content
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to submit feedback' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, feedbackId: result.feedbackId })
  } catch (error) {
    console.error('Error in feedback API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
