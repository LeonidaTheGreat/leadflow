import { NextRequest, NextResponse } from 'next/server'
import { postgrestAdmin } from '@/lib/db'
import { requireAdmin } from '@/lib/services/AuthService'
import { logger } from '@/lib/logger'

/**
 * GET /api/admin/verify-email
 * Returns all agents where email_verified=false (id, name, email, created_at).
 */
export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: agents, error } = await postgrestAdmin
      .from('real_estate_agents')
      .select('id,first_name,last_name,email,created_at')
      .eq('email_verified', false)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Unverified agents query failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const result = (agents ?? []).map((a: any) => ({
      id: a.id,
      name: `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim() || a.email,
      email: a.email,
      created_at: a.created_at,
    }))

    return NextResponse.json({ agents: result })
  } catch (err) {
    logger.error('Verify-email GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/admin/verify-email
 * Body: { agentId: string } — mark a single agent email_verified=true
 *    OR { all: true }       — mark ALL unverified agents email_verified=true
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

  const { agentId, all } = body ?? {}

  if (!agentId && !all) {
    return NextResponse.json({ error: 'agentId or all required' }, { status: 400 })
  }

  try {
    let query = postgrestAdmin
      .from('real_estate_agents')
      .update({ email_verified: true })
      .eq('email_verified', false)

    if (!all) {
      query = query.eq('id', agentId)
    }

    const { error } = await query

    if (error) {
      logger.error('Email verification override failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    logger.info('Email verification override applied', { agentId: agentId ?? 'all', all: !!all })
    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('Verify-email POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
