import { NextRequest, NextResponse } from 'next/server'
import { postgrestAdmin } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, notes, priority } = body

    const updates: Record<string, unknown> = {}
    if (status) updates.status = status
    if (notes !== undefined) updates.notes = notes
    if (priority !== undefined) updates.priority = priority

    const { data, error } = await postgrestAdmin
      .from('pilot_recruitment_targets')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Target not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, target: data })
  } catch (err) {
    logger.error('Error updating target:', err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
