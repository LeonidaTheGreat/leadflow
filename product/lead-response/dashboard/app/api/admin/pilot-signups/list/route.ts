import { NextRequest, NextResponse } from 'next/server'
import { postgrestAdmin } from '@/lib/db'
import { requireAdmin } from '@/lib/services/AuthService'
import { logger } from '@/lib/logger'

/**
 * GET /api/admin/pilot-signups/list
 * Returns paginated pilot signups with optional status filter.
 * Also annotates each signup with whether an invite has been sent.
 */
export async function GET(request: NextRequest) {
  try {
    if (!await requireAdmin(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '100')
    const status = searchParams.get('status') || ''
    const offset = (page - 1) * pageSize

    const query = postgrestAdmin
      .from('pilot_signups')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (status) {
      query.eq('status', status)
    }

    const { data: signups, error: signupsError } = await query

    if (signupsError) throw signupsError

    const { data: invites, error: invitesError } = await postgrestAdmin
      .from('pilot_invites')
      .select('email')

    if (invitesError) {
      logger.warn('Could not fetch pilot_invites for annotation:', invitesError)
    }

    const invitedEmails = new Set((invites || []).map((i: any) => i.email?.toLowerCase()))

    const rows = (signups || []).map((s: any) => ({
      ...s,
      invited: invitedEmails.has(s.email?.toLowerCase()),
    }))

    return NextResponse.json({ success: true, signups: rows, total: rows.length })
  } catch (error) {
    logger.error('Failed to fetch pilot signups:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pilot signups' },
      { status: 500 }
    )
  }
}
