import { NextRequest, NextResponse } from 'next/server'
import { postgrestAdmin } from '@/lib/db'
import { requireAdmin } from '@/lib/services/AuthService'

const VALID_STATUSES = ['new', 'contacted', 'approved', 'declined']

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const updates: Record<string, any> = {}

    if (body.status) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 })
      }
      updates.status = body.status
    }

    if (body.follow_up_stage !== undefined) {
      updates.follow_up_stage = body.follow_up_stage
    }

    if (body.last_follow_up_at !== undefined) {
      updates.last_follow_up_at = body.last_follow_up_at
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    updates.updated_at = new Date().toISOString()

    const { data, error } = await postgrestAdmin
      .from('pilot_signups')
      .update(updates)
      .eq('id', id)
      .select('id,name,email,phone,status,follow_up_stage,last_follow_up_at,updated_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })
    }

    return NextResponse.json({ prospect: data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
