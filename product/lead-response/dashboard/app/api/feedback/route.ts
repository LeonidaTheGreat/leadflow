import { NextRequest, NextResponse } from 'next/server'
import { submitProductFeedback } from '@/lib/nps-service'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

interface JWTPayload {
  userId: string
  email: string
  name?: string
}

function getAgentIdFromRequest(request: NextRequest): string | null {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return null
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload
    return payload.userId || null
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { feedbackType, content } = body

    // Extract agentId from authenticated session (server-side, secure)
    const agentId = getAgentIdFromRequest(request)

    if (!agentId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Validate required fields
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
