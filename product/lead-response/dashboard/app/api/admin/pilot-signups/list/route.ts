import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/services/AuthService'
import { postgrestAdmin } from '@/lib/db'
import { logger } from '@/lib/logger'

const VALID_STATUS = new Set(['new', 'contacted', 'approved', 'declined'])

export async function GET(request: NextRequest) {
  try {
    if (!(await requireAdmin(request))) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const crm = searchParams.get('crm')
    const monthlyLeads = searchParams.get('monthly_leads')
    const page = Math.max(1, Number(searchParams.get('page') || 1))
    const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') || 50)))

    let query = postgrestAdmin
      .from('pilot_signups')
      .select('id,name,email,phone,brokerage_name,team_name,monthly_leads,current_crm,status,source,utm_campaign,follow_up_sent,created_at,updated_at,contacted_at')
      .order('created_at', { ascending: false })

    if (status && VALID_STATUS.has(status)) query = query.eq('status', status)
    if (crm && crm !== 'all') query = query.eq('current_crm', crm)
    if (monthlyLeads && monthlyLeads !== 'all') query = query.eq('monthly_leads', monthlyLeads)

    const { data: allRows, error } = await query
    if (error) throw error

    const rows = allRows || []
    const total = rows.length
    const start = (page - 1) * limit
    const end = start + limit
    const pagedRows = rows.slice(start, end)

    const { data: inviteRows } = await postgrestAdmin
      .from('pilot_invites')
      .select('email,invited_at')

    const inviteMap = new Map<string, string>()
    for (const invite of inviteRows || []) {
      inviteMap.set(String(invite.email || '').toLowerCase(), invite.invited_at || null)
    }

    const signups = pagedRows.map((row: any) => {
      const invitedAt = inviteMap.get(String(row.email || '').toLowerCase()) || null
      return { ...row, invited: Boolean(invitedAt), invited_at: invitedAt }
    })

    const stats = {
      total,
      new: rows.filter((r: any) => r.status === 'new').length,
      follow_up_sent: rows.filter((r: any) => Boolean(r.follow_up_sent)).length,
      invited: rows.filter((r: any) => inviteMap.has(String(r.email || '').toLowerCase())).length,
    }

    return NextResponse.json({ signups, total, page, limit, stats })
  } catch (error: any) {
    logger.error('[pilot-signups/list] Error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Failed to load pilot signups' }, { status: 500 })
  }
}
