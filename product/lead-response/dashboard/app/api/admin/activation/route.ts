import { NextRequest, NextResponse } from 'next/server'
import { postgrestAdmin } from '@/lib/db'
import { requireAdmin } from '@/lib/services/AuthService'
import { logger } from '@/lib/logger'
import { sendSms, normalizePhone, isValidPhoneNumber } from '@/lib/twilio'

const ONBOARDING_URL = 'https://leadflow-ai-five.vercel.app/dashboard/onboarding'

function buildNudgeMessage(firstName: string | null): string {
  const name = (firstName ?? '').trim() || 'there'
  return `Hi ${name}, your LeadFlow AI trial is ready. Finish setup in 2 min: ${ONBOARDING_URL}`
}

/**
 * GET /api/admin/activation?stage=not_started|in_progress
 * - not_started (default): email_verified=true, onboarding_step=0, onboarding_completed=false
 * - in_progress: email_verified=true, onboarding_step>0, onboarding_completed=false
 */
export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const stage = request.nextUrl.searchParams.get('stage') ?? 'not_started'

  try {
    let query = postgrestAdmin
      .from('real_estate_agents')
      .select('id,first_name,last_name,email,phone_number,created_at,onboarding_step,last_activation_sms_at')
      .eq('email_verified', true)
      .eq('onboarding_completed', false)
      .order('created_at', { ascending: false })

    if (stage === 'in_progress') {
      query = query.gt('onboarding_step', 0)
    } else {
      query = query.eq('onboarding_step', 0)
    }

    const { data: agents, error } = await query

    if (error) {
      logger.error('Activation list query failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const result = (agents ?? []).map((a: any) => ({
      id: a.id,
      first_name: a.first_name ?? null,
      last_name: a.last_name ?? null,
      name: `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim() || a.email,
      email: a.email,
      phone_number: a.phone_number ?? null,
      onboarding_step: a.onboarding_step ?? 0,
      created_at: a.created_at,
      last_activation_sms_at: a.last_activation_sms_at ?? null,
    }))

    return NextResponse.json({ agents: result })
  } catch (err) {
    logger.error('Activation GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/admin/activation
 * Body: { agentId: string } — send SMS nudge to a single agent
 *    OR { bulkAll: true }  — send to all not_started agents without a prior nudge
 * Returns: { sent: number, results: Array<{id, email, status, error?}> }
 */
export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { agentId, bulkAll } = body ?? {}

  if (!agentId && !bulkAll) {
    return NextResponse.json({ error: 'agentId or bulkAll required' }, { status: 400 })
  }

  try {
    let query = postgrestAdmin
      .from('real_estate_agents')
      .select('id,first_name,email,phone_number,last_activation_sms_at')
      .eq('email_verified', true)
      .eq('onboarding_completed', false)
      .eq('onboarding_step', 0)

    if (agentId) {
      query = query.eq('id', agentId)
    } else {
      query = query.is('last_activation_sms_at', null).not('phone_number', 'is', null)
    }

    const { data: targets, error: fetchError } = await query

    if (fetchError) {
      logger.error('Activation target fetch failed:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!targets || targets.length === 0) {
      if (agentId) {
        return NextResponse.json({ error: 'Agent not found or not eligible' }, { status: 404 })
      }
      return NextResponse.json({ sent: 0, results: [] })
    }

    const results: Array<{ id: string; email: string; status: 'sent' | 'skipped' | 'failed'; error?: string }> = []

    for (const agent of targets as any[]) {
      const rawPhone = agent.phone_number as string | null

      if (!rawPhone) {
        results.push({ id: agent.id, email: agent.email, status: 'skipped', error: 'No phone on file' })
        continue
      }

      const phone = normalizePhone(rawPhone)
      if (!isValidPhoneNumber(phone)) {
        results.push({ id: agent.id, email: agent.email, status: 'skipped', error: `Invalid phone: ${rawPhone}` })
        continue
      }

      const message = buildNudgeMessage(agent.first_name)
      const smsResult = await sendSms({ to: phone, body: message })

      if (smsResult.success) {
        const now = new Date().toISOString()
        const { error: updateError } = await postgrestAdmin
          .from('real_estate_agents')
          .update({ last_activation_sms_at: now })
          .eq('id', agent.id)

        if (updateError) {
          logger.warn('Failed to record activation SMS timestamp', { agentId: agent.id, error: updateError.message })
        }

        logger.info('Activation SMS sent', { agentId: agent.id, email: agent.email, mock: smsResult.mock })
        results.push({ id: agent.id, email: agent.email, status: 'sent' })
      } else {
        logger.warn('Activation SMS failed', { agentId: agent.id, email: agent.email, error: smsResult.error })
        results.push({ id: agent.id, email: agent.email, status: 'failed', error: smsResult.error })
      }
    }

    const sentCount = results.filter(r => r.status === 'sent').length
    return NextResponse.json({ sent: sentCount, results })
  } catch (err) {
    logger.error('Activation POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
