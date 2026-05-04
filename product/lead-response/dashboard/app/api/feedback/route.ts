import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { submitProductFeedback } from '@/lib/nps-service'
import { logger } from '@/lib/logger'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const VALID_FEEDBACK_TYPES = ['praise', 'bug', 'idea', 'frustration']

export async function POST(request: NextRequest) {
  try {
    // ── Auth ─────────────────────────────────────────────────────────────
    const tokenCookie = request.cookies.get('auth-token')?.value || request.cookies.get('auth_token')?.value
    if (!tokenCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    let agentId: string
    try {
      const payload = jwt.verify(tokenCookie, JWT_SECRET) as any
      agentId = payload.userId || payload.id
      if (!agentId) throw new Error('No userId in token')
    } catch {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

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
    if (!VALID_FEEDBACK_TYPES.includes(feedbackType)) {
      return NextResponse.json(
        { error: 'Invalid feedback type. Must be one of: ' + VALID_FEEDBACK_TYPES.join(', ') },
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
      feedbackId: result.feedbackId })
  } catch (error: any) {
    logger.error('Error submitting feedback:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
