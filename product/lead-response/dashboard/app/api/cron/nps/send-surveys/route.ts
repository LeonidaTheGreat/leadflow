/**
 * GET /api/cron/nps/send-surveys
 * Cron job endpoint to send NPS surveys to agents due for survey
 * feat-nps-agent-feedback
 * 
 * This should be called by a scheduled job (e.g., Vercel Cron, external scheduler)
 * Protected by CRON_SECRET to prevent unauthorized access
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAgentsDueForSurvey, generateSurveyToken } from '@/lib/nps-service'
import { sendBatchNPSSurveys } from '@/lib/nps-email-service'

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('🔄 Running NPS survey cron job...')

    // Get agents due for survey
    const agentsDue = await getAgentsDueForSurvey()

    if (agentsDue.length === 0) {
      console.log('✅ No agents due for NPS survey')
      return NextResponse.json({
        success: true,
        message: 'No agents due for survey',
        sent: 0,
        failed: 0,
      })
    }

    console.log(`📧 Found ${agentsDue.length} agents due for NPS survey`)

    // Send survey emails
    const results = await sendBatchNPSSurveys(agentsDue, generateSurveyToken)

    console.log(`✅ NPS survey cron complete: ${results.sent} sent, ${results.failed} failed`)

    return NextResponse.json({
      success: true,
      message: `Sent ${results.sent} surveys, ${results.failed} failed`,
      sent: results.sent,
      failed: results.failed,
      errors: results.errors,
    })

  } catch (error: any) {
    console.error('Error in NPS survey cron:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cron/nps/send-surveys
 * Alternative POST endpoint for cron jobs
 */
export async function POST(request: NextRequest) {
  return GET(request)
}
