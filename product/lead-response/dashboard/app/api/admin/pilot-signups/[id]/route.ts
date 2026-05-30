import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/services/AuthService'
import { postgrestAdmin } from '@/lib/db'
import { logger } from '@/lib/logger'

const ALLOWED_STATUS = new Set(['new', 'contacted', 'approved', 'declined'])

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    if (!(await requireAdmin(request))) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()
    const status = body?.status

    if (!status || !ALLOWED_STATUS.has(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status value' }, { status: 400 })
    }

    const nowIso = new Date().toISOString()
    const updatePatch: Record<string, string | null> = {
      status,
      updated_at: nowIso,
      contacted_at: status === 'contacted' ? nowIso : null,
    }

    const { data, error } = await postgrestAdmin
      .from('pilot_signups')
      .update(updatePatch)
      .eq('id', id)
      .select('*')
      .single()

    if (error || !data) {
      return NextResponse.json({ success: false, error: 'Signup not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, signup: data })
  } catch (error: any) {
    logger.error('[pilot-signups/:id] error', { message: error.message })
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 })
  }
}
