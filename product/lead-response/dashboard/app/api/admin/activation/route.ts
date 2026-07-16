import { NextRequest, NextResponse } from 'next/server'
import { postgrestAdmin } from '@/lib/db'
import { requireAdmin } from '@/lib/services/AuthService'
import { logger } from '@/lib/logger'

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-five.vercel.app').trim().replace(/\/$/, '')

/**
 * GET /api/admin/activation
 * Returns all agents with email_verified=false, ordered by signup date.
 * Auth: admin session cookie required.
 */
export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data, error } = await postgrestAdmin
      .from('real_estate_agents')
      .select('id,first_name,last_name,email,created_at')
      .eq('email_verified', false)
      .order('created_at', { ascending: true })

    if (error) {
      logger.error('Failed to fetch unverified agents:', error)
      return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 })
    }

    const agents = data ?? []
    return NextResponse.json({ agents, count: agents.length })
  } catch (err) {
    logger.error('Unexpected error in GET /api/admin/activation:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/admin/activation
 * Body: { agentId: string } — verify a single agent
 *       { all: true }       — verify all unverified agents
 * Returns loginUrl (single) or count (bulk).
 * Auth: admin session cookie required.
 */
export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { agentId?: string; all?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { agentId, all } = body

  if (all) {
    try {
      const { data: beforeData } = await postgrestAdmin
        .from('real_estate_agents')
        .select('id')
        .eq('email_verified', false)

      const count = (beforeData ?? []).length

      const { error } = await postgrestAdmin
        .from('real_estate_agents')
        .update({ email_verified: true })
        .eq('email_verified', false)

      if (error) {
        logger.error('Failed to bulk-verify agents:', error)
        return NextResponse.json({ error: 'Failed to verify agents' }, { status: 500 })
      }

      return NextResponse.json({ success: true, count, loginUrl: `${APP_URL}/login` })
    } catch (err) {
      logger.error('Unexpected error in bulk verify:', err)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }

  if (!agentId || typeof agentId !== 'string') {
    return NextResponse.json({ error: 'agentId is required' }, { status: 400 })
  }

  try {
    const { data, error } = await postgrestAdmin
      .from('real_estate_agents')
      .update({ email_verified: true })
      .eq('id', agentId)
      .select('id,email,first_name,last_name')

    if (error) {
      logger.error('Failed to verify agent', { agentId, error })
      return NextResponse.json({ error: 'Failed to verify agent' }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const agent = data[0]
    return NextResponse.json({
      success: true,
      agentId: agent.id,
      email: agent.email,
      firstName: agent.first_name,
      lastName: agent.last_name,
      loginUrl: `${APP_URL}/login`,
    })
  } catch (err) {
    logger.error('Unexpected error in single verify:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
