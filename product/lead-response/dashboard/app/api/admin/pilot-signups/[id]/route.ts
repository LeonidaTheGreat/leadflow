import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/services/AuthService'
import { postgrestAdmin } from '@/lib/db'
import { logger } from '@/lib/logger'

const VALID_STATUS = new Set(['new', 'contacted', 'approved', 'declined'])

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    if (!(await requireAdmin(request))) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()
    const status = body?.status

    if (!VALID_STATUS.has(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status value' }, { status: 400 })
    }

    const patch: any = { status, updated_at: new Date().toISOString() }
    if (status === 'contacted') patch.contacted_at = new Date().toISOString()

    const { data, error } = await postgrestAdmin
      .from('pilot_signups')
      .update(patch)
      .eq('id', id)
      .select('id,name,email,phone,brokerage_name,team_name,monthly_leads,current_crm,status,source,utm_campaign,follow_up_sent,created_at,updated_at,contacted_at')
      .single()

    if (error || !data) {
      return NextResponse.json({ success: false, error: 'Signup not found or update failed' }, { status: 404 })
    }

    return NextResponse.json({ success: true, signup: data })
  } catch (error: any) {
    logger.error('[pilot-signups/:id] Error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Failed to update pilot signup' }, { status: 500 })
  }
}
