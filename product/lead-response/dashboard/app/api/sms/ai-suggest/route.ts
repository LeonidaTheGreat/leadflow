import { NextRequest, NextResponse } from 'next/server'
import { getLeadById, getAgentById } from '@/lib/supabase'
import { generateAiSmsResponse } from '@/lib/ai'
import { checkAiRateLimit } from '@/lib/rate-limit'
import { createErrorResponse, logError, classifyAiError } from '@/lib/error-handler'

/**
 * POST /api/sms/ai-suggest
 * 
 * UC-7: AI Assist for Manual SMS Composition
 * UC-3: AI Assist timeout protection
 * 
 * Accepts:
 * - lead_id: UUID (required)
 * 
 * Returns:
 * - message: string (AI-generated suggestion)
 * - confidence: number (0-1)
 * 
 * Errors:
 * - 400: Missing lead_id
 * - 404: Lead or agent not found
 * - 429: Rate limit exceeded
 * - 504: AI timeout
 * - 503: AI service error
 */

// Helper: Timeout wrapper for AI generation
async function generateWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 5000
): Promise<T> {
  const timeoutPromise = new Promise<T>((_, reject) =>
    setTimeout(() => reject(new Error('AI timeout')), timeoutMs)
  );
  return Promise.race([promise, timeoutPromise]);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { lead_id } = body

    // 1. Validate input
    if (!lead_id) {
      const err = createErrorResponse('MISSING_LEAD_ID');
      return NextResponse.json(err.response, { status: err.statusCode })
    }

    // 2. Get lead with agent
    const { data: lead, error: leadError } = await getLeadById(lead_id)
    
    if (leadError || !lead) {
      logError('LEAD_NOT_FOUND', { lead_id });
      const err = createErrorResponse('LEAD_NOT_FOUND');
      return NextResponse.json(err.response, { status: err.statusCode })
    }

    // 3. Get agent
    if (!lead.agent_id) {
      logError('AGENT_NOT_FOUND', { lead_id });
      const err = createErrorResponse('AGENT_NOT_FOUND');
      return NextResponse.json(err.response, { status: err.statusCode })
    }

    const { data: agent } = await getAgentById(lead.agent_id)
    
    if (!agent) {
      logError('AGENT_NOT_FOUND', { lead_id, agent_id: lead.agent_id });
      const err = createErrorResponse('AGENT_NOT_FOUND');
      return NextResponse.json(err.response, { status: err.statusCode })
    }

    // 4. Check rate limit
    const rateLimit = checkAiRateLimit(lead_id);
    if (!rateLimit.allowed) {
      logError('RATE_LIMIT_EXCEEDED', { 
        lead_id, 
        type: 'ai_suggest',
        remaining: rateLimit.remaining 
      });
      const err = createErrorResponse('RATE_LIMIT_EXCEEDED');
      return NextResponse.json(
        {
          ...err.response,
          resetInSeconds: rateLimit.resetInSeconds,
        },
        { status: err.statusCode }
      );
    }

    // 5. Generate AI suggestion with timeout (Edge Case 3)
    let aiResponse;
    try {
      aiResponse = await generateWithTimeout(
        generateAiSmsResponse(lead, agent, { trigger: 'manual' }),
        5000 // 5 second timeout
      )
    } catch (timeoutError: any) {
      if (timeoutError.message === 'AI timeout') {
        logError('AI_TIMEOUT', { lead_id });
        const err = createErrorResponse('AI_TIMEOUT');
        return NextResponse.json(err.response, { status: err.statusCode })
      }
      throw timeoutError;
    }

    return NextResponse.json({
      message: aiResponse.message,
      confidence: aiResponse.confidence,
    })

  } catch (error: any) {
    // Classify error
    const errorInfo = classifyAiError(error);
    logError(errorInfo.code, { errorMessage: error?.message }, error);
    
    return NextResponse.json(
      {
        error: errorInfo.userMessage,
        action: errorInfo.userAction,
        code: errorInfo.code,
        category: errorInfo.category,
        retryable: errorInfo.retryable,
      },
      { status: errorInfo.statusCode }
    )
  }
}
