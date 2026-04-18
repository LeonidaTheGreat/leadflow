import { NextRequest, NextResponse } from 'next/server'
import { postgrestAdmin } from '@/lib/db'
import { logger } from '@/lib/logger'

function checkAdminAuth(request: NextRequest): boolean {
  const adminToken = request.headers.get('x-admin-token')
  const expectedToken = process.env.ADMIN_SECRET
  if (!expectedToken) return false
  return adminToken === expectedToken
}

/**
 * GET /api/admin/outreach/targets
 *
 * Returns all pilot_recruitment_targets with last touchpoint timestamp.
 * Auth: X-Admin-Token header
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    if (!checkAdminAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: targets, error } = await postgrestAdmin
      .from('pilot_recruitment_targets')
      .select('id,name,email,location,brokerage,status,created_at,updated_at')
      .order('created_at', { ascending: true })

    if (error) {
      logger.error('[outreach/targets] Failed to fetch targets:', error)
      return NextResponse.json({ error: 'Failed to fetch targets' }, { status: 500 })
    }

    const targetIds = (targets ?? []).map((t: any) => t.id)
    let lastTouchMap: Record<string, string> = {}

    if (targetIds.length > 0) {
      const { data: touchpoints } = await postgrestAdmin
        .from('pilot_recruitment_touchpoints')
        .select('target_id,sent_at')
        .in('target_id', targetIds)
        .order('sent_at', { ascending: false })

      for (const tp of touchpoints ?? []) {
        if (!lastTouchMap[tp.target_id]) {
          lastTouchMap[tp.target_id] = tp.sent_at
        }
      }
    }

    const enriched = (targets ?? []).map((t: any) => ({
      ...t,
      last_touch: lastTouchMap[t.id] ?? null,
    }))

    return NextResponse.json({ targets: enriched })
  } catch (err: any) {
    logger.error('[outreach/targets] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
