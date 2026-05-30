import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/services/AuthService'
import { postgrestAdmin } from '@/lib/db'
import { logger } from '@/lib/logger'

const ALLOWED_STATUS = new Set(['new', 'contacted', 'approved', 'declined'])
const ALLOWED_CRM = new Set(['follow_up_boss', 'liondesk', 'kvcore', 'other', 'none'])
const ALLOWED_LEADS = new Set(['1-10', '11-50', '51-100', '100+'])
const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    if (!(await requireAdmin(request))) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const crm = searchParams.get('crm')
    const monthlyLeads = searchParams.get('monthly_leads')
    const page = Math.max(parseInt(searchParams.get('page') || String(DEFAULT_PAGE), 10), 1)
    const requestedLimit = Math.max(parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10), 1)
    const limit = Math.min(requestedLimit, MAX_LIMIT)

    let query = postgrestAdmin.from('pilot_signups').select('*', { count: 'exact' }).order('created_at', { ascending: false })

    if (status) {
      if (!ALLOWED_STATUS.has(status)) return NextResponse.json({ success: false, error: 'Invalid status filter' }, { status: 400 })
      query = query.eq('status', status)
    }

    if (crm) {
      if (!ALLOWED_CRM.has(crm)) return NextResponse.json({ success: false, error: 'Invalid CRM filter' }, { status: 400 })
      query = query.eq('current_crm', crm)
    }

    if (monthlyLeads) {
      if (!ALLOWED_LEADS.has(monthlyLeads)) return NextResponse.json({ success: false, error: 'Invalid monthly_leads filter' }, { status: 400 })
      query = query.eq('monthly_leads', monthlyLeads)
    }

    const from = (page - 1) * limit
    const to = from + limit - 1
    const listResult = await query.range(from, to)
    if (listResult.error) throw listResult.error

    const [statsResult, inviteResult] = await Promise.all([
      postgrestAdmin.from('pilot_signups').select('id,email,status,follow_up_sent', { count: 'exact' }),
      postgrestAdmin.from('pilot_invites').select('email'),
    ])

    if (statsResult.error) throw statsResult.error
    if (inviteResult.error) throw inviteResult.error

    const inviteEmails = new Set((inviteResult.data || []).map((item: any) => (item.email || '').toLowerCase()))
    const signups = (listResult.data || []).map((signup: any) => ({ ...signup, invited: inviteEmails.has((signup.email || '').toLowerCase()) }))

    const statsRows = statsResult.data || []
    let invitedCount = 0
    for (const row of statsRows) {
      if (inviteEmails.has((row.email || '').toLowerCase())) invitedCount += 1
    }

    return NextResponse.json({
      signups,
      total: listResult.count || 0,
      page,
      limit,
      stats: {
        total: statsResult.count || 0,
        new: statsRows.filter((row: any) => row.status === 'new').length,
        follow_up_sent: statsRows.filter((row: any) => row.follow_up_sent === true).length,
        invited: invitedCount,
      },
    })
  } catch (error: any) {
    logger.error('[pilot-signups/list] error', { message: error.message })
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 })
  }
}
