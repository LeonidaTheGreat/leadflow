/**
 * Task Spec (Task ID: 34f585c0-9549-442b-9386-d00d278e9de6)
 * What:
 * - Update `product/lead-response/dashboard/app/api/cron/pilot-recruitment-outreach/route.ts` so Vercel cron GET requests execute the same outreach blast flow as POST requests.
 * - Add route-level regression tests in `product/lead-response/dashboard/__tests__/pilot-recruitment-outreach-cron.test.ts` for auth, GET execution, and POST execution.
 * Verify:
 * - `cd product/lead-response/dashboard && npm test -- --runInBand __tests__/pilot-recruitment-outreach-cron.test.ts` exits 0.
 * - `cd product/lead-response/dashboard && npm test -- --runInBand __tests__/pilot-outreach-blast.test.ts` exits 0.
 * - `cd product/lead-response/dashboard && npm run build` exits 0.
 * - `npm test` exits 0.
 * - `npm run build` exits 0.
 * Boundaries:
 * - Do not change outreach email copy or personalization logic.
 * - Do not modify DB schema/migrations.
 * - Do not change unrelated admin or cron routes.
 */
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

async function runAuthorizedBlast(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
  }

  const result = await blastService.runBlast()
  return NextResponse.json({ success: true, ...result })
}

export async function POST(request: NextRequest) {
  try {
    return await runAuthorizedBlast(request)
  } catch (error) {
    logger.error('[cron/pilot-recruitment-outreach] Failed:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    return await runAuthorizedBlast(request)
  } catch (error) {
    logger.error('[cron/pilot-recruitment-outreach] Failed:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
