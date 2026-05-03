import { NextRequest, NextResponse } from 'next/server'
import {
  getAgentsDueForSurvey,
  generateSurveyToken } from '@/lib/nps-service'
import { sendNPSSurveyEmail } from '@/lib/nps-email-service'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret — fail-closed (read per-request, not at module level)
    const cronSecret = process.env.CRON_SECRET
    const authHeader = request.headers.get('authorization')
    if (!cronSecret) {
      return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
    }
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get agents due for survey
    const agents = await getAgentsDueForSurvey()

    if (agents.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No agents due for NPS survey',
        sent: 0,
        failed: 0 })
    }

    // Send surveys
    const results = { sent: 0, failed: 0, errors: [] as string[] }

    for (const agent of agents) {
      try {
        const token = generateSurveyToken(agent.agent_id, agent.trigger)
        const success = await sendNPSSurveyEmail(
          agent.email,
          agent.agent_id,
          agent.name,
          token
        )

        if (success) {
          results.sent++
        } else {
          results.failed++
          results.errors.push(`Failed to send to ${agent.email}`)
        }
      } catch (error: any) {
        results.failed++
        results.errors.push(`Error sending to ${agent.email}: ${error.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `NPS surveys sent: ${results.sent}, failed: ${results.failed}`,
      ...results })
  } catch (error: any) {
    logger.error('Error in NPS survey cron:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Internal server error' },
      { status: 500 }
    )
  }
}
