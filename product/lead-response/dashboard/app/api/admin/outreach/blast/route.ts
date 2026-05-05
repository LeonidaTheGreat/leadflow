/**
 * Spec
 * What:
 * - Update `product/lead-response/dashboard/app/api/admin/outreach/blast/route.ts` to delegate blast and stats
 *   logic to `product/lead-response/dashboard/lib/services/pilot-outreach-blast-service.ts`.
 * - Add `product/lead-response/dashboard/app/api/cron/pilot-recruitment-outreach/route.ts` to run outreach
 *   automatically via CRON_SECRET-authenticated requests.
 * - Update `product/lead-response/dashboard/vercel.json` to schedule the new cron endpoint daily.
 * Verify:
 * - `cd product/lead-response/dashboard && npm run build` exits 0.
 * - `npm run lint` exits 0.
 * - `npm test` exits 0.
 * - `npm audit --audit-level=high` reports 0 high/critical.
 * - `rg -n "/api/cron/pilot-recruitment-outreach" product/lead-response/dashboard/vercel.json product/lead-response/dashboard/app/api/cron/pilot-recruitment-outreach/route.ts` returns matches.
 * Boundaries:
 * - Do not change outreach copy/templates or invite token semantics.
 * - Do not alter unrelated dashboard/admin APIs.
 * - Do not modify database schema/migrations for this fix.
 */
import { NextRequest, NextResponse } from 'next/server'
import { postgrestAdmin } from '@/lib/db'
import { logger } from '@/lib/logger'
import { sendPilotOutreachEmail } from '@/lib/outreach-email-service'
import { PilotOutreachBlastService } from '@/lib/services/pilot-outreach-blast-service'

// Admin auth check — verify X-Admin-Token header matches ADMIN_SECRET
function checkAdminAuth(request: NextRequest): boolean {
  const adminToken = request.headers.get('x-admin-token')
  const expectedToken = process.env.ADMIN_SECRET
  if (!expectedToken) return false
  return adminToken === expectedToken
}

const blastService = new PilotOutreachBlastService({
  db: postgrestAdmin,
  logger,
  sendPilotOutreachEmail,
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://app.landyourleads.com',
});

/**
 * POST /api/admin/outreach/blast
 *
 * Sends personalized outreach emails to all pilot_recruitment_targets with
 * status="identified" that have not yet received an initial touchpoint.
 *
 * For each eligible target:
 *   1. Checks for existing initial touchpoint (skips if found)
 *   2. Generates a demo token (stored hashed in demo_tokens table)
 *   3. Sends personalized email via Resend (via outreach-email-service)
 *   4. Inserts a touchpoint row (touch_type="initial", channel="email")
 *   5. Updates target status to "contacted"
 *
 * Returns: { sent: N, skipped: N, errors: string[] }
 *
 * Auth: X-Admin-Token header (must match ADMIN_SECRET)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    if (!checkAdminAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const result = await blastService.runBlast()
    return NextResponse.json(result)
  } catch (err: any) {
    logger.error('[outreach/blast] Fatal error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/admin/outreach/blast
 *
 * Returns campaign stats for the outreach blast admin page.
 *
 * Auth: X-Admin-Token header
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    if (!checkAdminAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stats = await blastService.getStats()
    return NextResponse.json({ stats })
  } catch (err: any) {
    logger.error('[outreach/blast] Stats error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
