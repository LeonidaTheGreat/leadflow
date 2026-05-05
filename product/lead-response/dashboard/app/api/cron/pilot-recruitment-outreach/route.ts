import { NextRequest, NextResponse } from 'next/server'
import { postgrestAdmin } from '@/lib/db'
import { logger } from '@/lib/logger'
import { sendPilotOutreachEmail } from '@/lib/outreach-email-service'
import { PilotOutreachBlastService } from '@/lib/services/pilot-outreach-blast-service'

const blastService = new PilotOutreachBlastService({
  db: postgrestAdmin,
  logger,
  sendPilotOutreachEmail,
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://app.landyourleads.com',
})

export async function POST(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
      const authHeader = request.headers.get('authorization')
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
      }
    }

    const result = await blastService.runBlast()
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    logger.error('[cron/pilot-recruitment-outreach] Failed:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Pilot recruitment outreach cron endpoint',
    method: 'POST',
    description: 'Sends outreach emails to identified pilot recruitment targets and marks contacted',
  })
}
