import { NextRequest, NextResponse } from 'next/server'
import { submitProductFeedback } from '@/lib/nps-service'
import { validateSession } from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
    // ── Auth ─────────────────────────────────────────────────────────────
    const sessionToken = request.cookies.get('leadflow_session')?.value
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = await validateSession(sessionToken)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const agentId = session.userId

    // ── Validate body ─────────────────────────────────────────────────────
    const body = await request.json()
    const { feedbackType, content } = body

    if (!feedbackType || !content) {
      return NextResponse.json(
        { error: 'Feedback type and content are required' },
        { status: 400 }
      )
    }

    // Validate feedback type
    const validTypes = ['praise', 'bug', 'idea', 'frustration']
    if (!validTypes.includes(feedbackType)) {
      return NextResponse.json(
        { error: 'Invalid feedback type. Must be one of: ' + validTypes.join(', ') },
        { status: 400 }
      )
    }

    // Validate content length
    if (content.length > 500) {
      return NextResponse.json(
        { error: 'Content must be 500 characters or less' },
        { status: 400 }
      )
    }

    const result = await submitProductFeedback(
      agentId,
      feedbackType,
      content,
      { submitted_via: 'dashboard' }
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      feedbackId: result.feedbackId,
    })
  } catch (error: any) {
    console.error('Error submitting feedback:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
