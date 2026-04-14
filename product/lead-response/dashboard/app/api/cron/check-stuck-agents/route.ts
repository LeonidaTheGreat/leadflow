import { NextRequest, NextResponse } from 'next/server'
import { postgrestAdmin } from '@/lib/db'
import { logger } from '@/lib/logger'

const onboardingTelemetry = require('@/lib/onboarding-telemetry')

export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET
    const authHeader = request.headers.get('authorization')
    const querySecret = new URL(request.url).searchParams.get('secret')

    if (!cronSecret) {
      logger.warn('[/api/cron/check-stuck-agents] CRON_SECRET not configured')
      return NextResponse.json(
        { error: 'CRON_SECRET not configured' },
        { status: 500 }
      )
    }

    const providedSecret = authHeader?.replace('Bearer ', '') || querySecret
    if (providedSecret !== cronSecret) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid cron secret' },
        { status: 401 }
      )
    }

    const result = await onboardingTelemetry.checkAndAlertStuckAgents(postgrestAdmin)

    if (!result.success) {
      logger.error('[/api/cron/check-stuck-agents] Error:', result.error)
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    logger.info(
      `[/api/cron/check-stuck-agents] Complete. Alerts created: ${result.alerts_created}`
    )

    return NextResponse.json(
      {
        success: true,
        message: `Checked for stuck agents. Created ${result.alerts_created} alerts.`,
        alerts_created: result.alerts_created,
      },
      { status: 200 }
    )
  } catch (error: any) {
    logger.error('[/api/cron/check-stuck-agents] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
