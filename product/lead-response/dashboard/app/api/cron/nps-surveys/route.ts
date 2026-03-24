import { NextRequest, NextResponse } from 'next/server'
import {
  getAgentsDueForSurvey,
  generateSurveyToken,
} from '@/lib/nps-service'
import { sendNPSSurveyEmail } from '@/lib/nps-email-service'

// Cron secret for authentication
const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get agents due for survey
    const agents = await getAgentsDueForSurvey()

    if (agents.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No agents due for NPS survey',
        sent: 0,
        failed: 0,
      })
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
      ...results,
    })
  } catch (error: any) {
    console.error('Error in NPS survey cron:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
