import { NextRequest, NextResponse } from 'next/server'
import { postgrestAdmin } from '@/lib/db'
import { requireAdmin } from '@/lib/services/AuthService'
import { logger } from '@/lib/logger'

const VALID_CHANNELS = ['email', 'call', 'sms', 'linkedin'] as const
const VALID_STATUSES = ['contacted', 'interested', 'declined', 'closed'] as const

/**
 * POST /api/admin/sales-cockpit/outreach-log
 * Log a contact attempt for an agent and optionally update their outreach status.
 */
export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { agentId, channel, notes, status } = body

    if (!agentId || typeof agentId !== 'string') {
      return NextResponse.json({ error: 'agentId is required' }, { status: 400 })
    }
    if (!channel || !VALID_CHANNELS.includes(channel as any)) {
      return NextResponse.json({ error: `channel must be one of: ${VALID_CHANNELS.join(', ')}` }, { status: 400 })
    }
    if (status && !VALID_STATUSES.includes(status as any)) {
      return NextResponse.json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 })
    }

    const { data, error } = await postgrestAdmin
      .from('outreach_log')
      .insert({
        agent_id: agentId,
        channel,
        notes: notes ?? null,
        status: status ?? 'contacted',
        contacted_at: new Date().toISOString(),
      })
      .select('id,agent_id,channel,notes,status,contacted_at,created_at')
      .single()

    if (error) {
      logger.error('Outreach log insert failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ log: data })
  } catch (error) {
    logger.error('Outreach log error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/sales-cockpit/outreach-log
 * Update the status of the most recent outreach log entry for an agent.
 */
export async function PATCH(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { agentId, status } = body

    if (!agentId || typeof agentId !== 'string') {
      return NextResponse.json({ error: 'agentId is required' }, { status: 400 })
    }
    if (!status || !VALID_STATUSES.includes(status as any)) {
      return NextResponse.json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 })
    }

    // Find the most recent log entry for this agent
    const { data: existing, error: fetchError } = await postgrestAdmin
      .from('outreach_log')
      .select('id')
      .eq('agent_id', agentId)
      .order('contacted_at', { ascending: false })
      .limit(1)
      .single()

    if (fetchError || !existing) {
      // No existing log — create one with this status
      const { data: inserted, error: insertError } = await postgrestAdmin
        .from('outreach_log')
        .insert({
          agent_id: agentId,
          channel: 'email',
          status,
          contacted_at: new Date().toISOString(),
        })
        .select('id,agent_id,status')
        .single()

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
      return NextResponse.json({ log: inserted })
    }

    const { data: updated, error: updateError } = await postgrestAdmin
      .from('outreach_log')
      .update({ status })
      .eq('id', existing.id)
      .select('id,agent_id,status')
      .single()

    if (updateError) {
      logger.error('Outreach log update failed:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ log: updated })
  } catch (error) {
    logger.error('Outreach log patch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
