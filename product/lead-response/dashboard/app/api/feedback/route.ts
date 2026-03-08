/**
 * POST /api/feedback
 * Submit general product feedback from agents
 * feat-nps-agent-feedback
 */

import { NextRequest, NextResponse } from 'next/server'
import { submitProductFeedback } from '@/lib/nps-service'
import { supabaseServer as supabase } from '@/lib/supabase-server'

const VALID_FEEDBACK_TYPES = ['praise', 'bug', 'idea', 'frustration'] as const

type FeedbackType = typeof VALID_FEEDBACK_TYPES[number]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { feedbackType, content, metadata } = body

    // Validate required fields
    if (!feedbackType || !content) {
      return NextResponse.json(
        { success: false, error: 'feedbackType and content are required' },
        { status: 400 }
      )
    }

    // Validate feedback type
    if (!VALID_FEEDBACK_TYPES.includes(feedbackType as FeedbackType)) {
      return NextResponse.json(
        { success: false, error: `feedbackType must be one of: ${VALID_FEEDBACK_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate content length
    if (content.length > 500) {
      return NextResponse.json(
        { success: false, error: 'Content must be 500 characters or less' },
        { status: 400 }
      )
    }

    if (content.length < 5) {
      return NextResponse.json(
        { success: false, error: 'Content must be at least 5 characters' },
        { status: 400 }
      )
    }

    // Get authenticated agent
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const sessionToken = authHeader.substring(7)
    
    // Verify session with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(sessionToken)
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      )
    }

    // Get agent ID from user
    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('email', user.email)
      .single()

    if (!agent) {
      return NextResponse.json(
        { success: false, error: 'Agent not found' },
        { status: 404 }
      )
    }

    // Submit feedback
    const result = await submitProductFeedback(
      agent.id,
      feedbackType as FeedbackType,
      content,
      metadata
    )

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Thanks! We read every submission.",
      feedbackId: result.feedbackId,
    })

  } catch (error: any) {
    console.error('Error submitting feedback:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
