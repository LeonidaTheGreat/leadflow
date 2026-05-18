/**
 * GET /api/admin/funnel/checkout-attempts
 *
 * Returns checkout initiation rate, completion rate, and abandonment rate
 * grouped by day. Reads from the subscription_attempts table.
 *
 * Auth: LEADFLOW_API_KEY bearer token (admin-only)
 *
 * Query params:
 *   days (integer, default 30) — how many days of history to return
 */

import { NextRequest, NextResponse } from 'next/server'
import { postgrestAdmin } from '@/lib/db'
import { logger } from '@/lib/logger'

function verifyAdminAuth(request: NextRequest): boolean {
  const apiKey = process.env.LEADFLOW_API_KEY
  if (!apiKey) return false

  const authHeader = request.headers.get('authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) return false

  const provided = authHeader.slice(7).trim()
  return provided === apiKey
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const days = Math.max(1, parseInt(searchParams.get('days') ?? '30', 10) || 30)
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  try {
    // subscription_attempts uses agent_id and status values:
    // 'session_created', 'session_expired'
    const { data: attempts, error } = await postgrestAdmin
      .from('subscription_attempts')
      .select('id, agent_id, tier, status, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: true })

    if (error) throw error

    // Group by day
    const byDay: Record<string, { initiated: number; completed: number; abandoned: number }> = {}

    for (const attempt of (attempts ?? []) as any[]) {
      const day = attempt.created_at.slice(0, 10) // YYYY-MM-DD
      if (!byDay[day]) {
        byDay[day] = { initiated: 0, completed: 0, abandoned: 0 }
      }
      byDay[day].initiated += 1
      if (attempt.status === 'session_expired') {
        byDay[day].abandoned += 1
      } else if (attempt.status === 'session_completed') {
        byDay[day].completed += 1
      }
    }

    // Build daily array with rates
    const daily = Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({
        date,
        initiated: counts.initiated,
        completed: counts.completed,
        abandoned: counts.abandoned,
        completion_rate: counts.initiated > 0
          ? Math.round((counts.completed / counts.initiated) * 10000) / 100
          : 0,
        abandonment_rate: counts.initiated > 0
          ? Math.round((counts.abandoned / counts.initiated) * 10000) / 100
          : 0 }))

    // Totals
    const totalInitiated = (attempts ?? []).length
    const totalCompleted = ((attempts ?? []) as any[]).filter((a: any) => a.status === 'session_completed').length
    const totalAbandoned = ((attempts ?? []) as any[]).filter((a: any) => a.status === 'session_expired').length

    return NextResponse.json({
      summary: {
        days,
        total_initiated: totalInitiated,
        total_completed: totalCompleted,
        total_abandoned: totalAbandoned,
        completion_rate: totalInitiated > 0
          ? Math.round((totalCompleted / totalInitiated) * 10000) / 100
          : 0,
        abandonment_rate: totalInitiated > 0
          ? Math.round((totalAbandoned / totalInitiated) * 10000) / 100
          : 0,
        as_of: new Date().toISOString() },
      daily })
  } catch (err: any) {
    logger.error('[checkout-attempts] error:', err?.message ?? err)
    return NextResponse.json(
      { error: 'Internal server error', detail: err?.message ?? 'unknown' },
      { status: 500 },
    )
  }
}
