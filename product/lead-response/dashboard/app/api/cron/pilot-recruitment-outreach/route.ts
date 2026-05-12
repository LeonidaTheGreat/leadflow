/**
 * TASK SPEC (fe12c74c-f8e5-49a5-b3a2-0ca5011be56a)
 * What:
 * - Update `product/lead-response/dashboard/app/api/cron/pilot-recruitment-outreach/route.ts`
 *   so `GET` executes the same outreach blast flow as `POST` (Vercel cron invokes GET).
 * - Add a focused regression test file under `product/lead-response/dashboard/tests/`
 *   to verify GET execution/auth behavior and prevent this regression.
 * Verify:
 * - `node product/lead-response/dashboard/tests/fix-pilot-outreach-cron-get-executes.test.js`
 *   exits 0 and asserts cron GET path is executable + auth guarded.
 * - `npm test` exits 0.
 * - `npm run build` exits 0.
 * - `cd product/lead-response/dashboard && npx next build` exits 0.
 * Boundaries:
 * - Do not change outreach email copy/templates.
 * - Do not change pilot target selection/status transition logic in blast service.
 * - Do not modify DB schema or migrations.
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

export async function POST(request: NextRequest) {
  try {
    return await runOutreachBlast(request)
  } catch (error) {
    logger.error('[cron/pilot-recruitment-outreach] Failed:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return await runOutreachBlast(request)
}

async function runOutreachBlast(request: NextRequest) {
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
