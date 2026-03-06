import { NextRequest, NextResponse } from 'next/server'
import { sendSms, SendSmsResult } from '@/lib/twilio'
import { createMessage, getLeadById } from '@/lib/supabase'
import { generateAiSmsResponse } from '@/lib/ai'
import { getAgentById } from '@/lib/supabase'
import { checkSmsRateLimit } from '@/lib/rate-limit'
import { getErrorInfo, classifyTwilioError, createErrorResponse, logError } from '@/lib/error-handler'

// ============================================
// SEND SMS API - UC-7/8 Edge Cases
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { lead_id, message, ai_generate = false } = body

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

    // 3. Check consent (Edge Case 1: Opt-out during conversation)
    if (lead.dnc || !lead.consent_sms) {
      const code = lead.dnc ? 'LEAD_ON_DNC' : 'LEAD_OPTED_OUT';
      logError(code, { lead_id });
      const err = createErrorResponse(code);
      return NextResponse.json(err.response, { status: err.statusCode })
    }

    // 4. Check rate limit (Edge Case 4: Rapid-fire sends)
    const rateLimit = checkSmsRateLimit(lead_id);
    if (!rateLimit.allowed) {
      logError('RATE_LIMIT_EXCEEDED', { lead_id, remaining: rateLimit.remaining });
      const err = createErrorResponse('RATE_LIMIT_EXCEEDED');
      return NextResponse.json(
        {
          ...err.response,
          resetInSeconds: rateLimit.resetInSeconds,
        },
        { status: err.statusCode }
      );
    }

    // 5. Get agent
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

    // 6. Determine message content
    let messageBody: string
    let aiConfidence: number | undefined

    if (ai_generate) {
      try {
        // Edge Case 3: AI Assist timeout (handled in AI function)
        const aiResponse = await generateAiSmsResponse(lead, agent, {
          trigger: 'followup',
        })
        messageBody = aiResponse.message
        aiConfidence = aiResponse.confidence
      } catch (aiError: any) {
        logError('AI_GENERATION_FAILED', { lead_id }, aiError);
        const err = createErrorResponse('AI_GENERATION_FAILED');
        return NextResponse.json(err.response, { status: err.statusCode })
      }
    } else {
      if (!message || !message.trim()) {
        const err = createErrorResponse('MISSING_MESSAGE');
        return NextResponse.json(err.response, { status: err.statusCode })
      }
      messageBody = message.trim()
    }

    // 7. Send SMS (Edge Case 2: Twilio delivery failure)
    const result = await sendSms({
      to: lead.phone,
      body: messageBody,
      statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/sms/status`,
    })

    if (!result.success) {
      // Classify Twilio error
      const errorInfo = classifyTwilioError(result.errorCode, result.error)
      logError(errorInfo.code, { 
        lead_id, 
        phone: lead.phone, 
        errorCode: result.errorCode,
        errorMessage: result.error,
      });

      // Save failed message to database for debugging
      await createMessage({
        lead_id: lead.id,
        direction: 'outbound',
        channel: 'sms',
        message_body: messageBody,
        ai_generated: ai_generate,
        ai_confidence: aiConfidence,
        twilio_sid: null,
        twilio_status: null,
        twilio_error_code: result.errorCode,
        twilio_error_message: result.error,
        status: 'failed',
        failed_at: new Date().toISOString(),
      })

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

    // 8. Save successful message to database with cost tracking
    await createMessage({
      lead_id: lead.id,
      direction: 'outbound',
      channel: 'sms',
      message_body: messageBody,
      ai_generated: ai_generate,
      ai_confidence: aiConfidence,
      twilio_sid: result.messageSid,
      twilio_status: result.status,
      status: 'sent',
      sent_at: new Date().toISOString(),
      twilio_price: result.price ? parseFloat(result.price) : null,
      twilio_price_unit: result.priceUnit || 'USD',
      twilio_num_segments: result.numSegments ? parseInt(result.numSegments, 10) : 1,
    })

    return NextResponse.json({
      success: true,
      message_sid: result.messageSid,
      status: result.status,
      mock: result.mock,
    })

  } catch (error: any) {
    logError('INTERNAL_ERROR', { errorMessage: error?.message }, error);
    const err = createErrorResponse('INTERNAL_ERROR', { originalError: error?.message });
    return NextResponse.json(err.response, { status: err.statusCode })
  }
}
