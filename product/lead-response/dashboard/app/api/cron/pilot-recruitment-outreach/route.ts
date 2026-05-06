/**
 * Spec
 * What:
 * - Update `product/lead-response/dashboard/app/api/cron/pilot-recruitment-outreach/route.ts` so both `GET` and `POST`
 *   execute pilot outreach blast logic (Vercel cron invokes GET).
 * - Add a regression test at `product/lead-response/dashboard/tests/fix-30-pilot-campaign-stalled-at-day-8.test.js`
 *   to enforce that GET is executable, guarded by cron auth, and calls `runBlast`.
 * Verify:
 * - `cd product/lead-response/dashboard && npm test -- --runInBand tests/fix-30-pilot-campaign-stalled-at-day-8.test.js` passes.
 * - `cd product/lead-response/dashboard && npm test` passes.
 * - `cd product/lead-response/dashboard && npm run build` passes.
 * - `cd product/lead-response/dashboard && npm run lint` passes.
 * - `cd product/lead-response/dashboard && npm audit --audit-level=high` reports 0 high/critical findings.
 * Boundaries:
 * - Do not change outreach email copy, blast selection criteria, or DB schema.
 * - Do not modify unrelated admin routes/pages.
 * - Do not alter non-dashboard runtime behavior.
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

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return true
  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${cronSecret}`
}

async function runOutreach(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
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

export async function POST(request: NextRequest) {
  return runOutreach(request)
}

export async function GET(request: NextRequest) {
  return runOutreach(request)
}
