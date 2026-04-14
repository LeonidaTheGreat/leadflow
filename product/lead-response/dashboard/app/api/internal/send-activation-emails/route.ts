/**
 * POST /api/internal/send-activation-emails
 *
 * Sends activation emails (CTA to /onboarding) to verified agents who have
 * never received one — the 183 agents stuck after email verification.
 *
 * Auth: API_SECRET_KEY bearer token required.
 * Safe to run multiple times: skips agents where activation_email_sent = true.
 *
 * Query params:
 *   - limit (default 50): max agents to process per call (batching safety)
 *   - dry_run (default false): if true, returns eligible agents but sends nothing
 */

import { NextRequest, NextResponse } from 'next/server'
import { postgrestAdmin as db } from '@/lib/db'
import { sendActivationEmail } from '@/lib/verification-email'
import { logger } from '@/lib/logger'

function isAuthorized(req: NextRequest): boolean {
  const secret = (process.env.API_SECRET_KEY || '').trim()
  if (!secret) return false
  const auth = req.headers.get('authorization') || ''
  return auth === `Bearer ${secret}`
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)
  const dryRun = searchParams.get('dry_run') === 'true'

  try {
    // Fetch verified agents who haven't received an activation email
    const { data: agents, error } = await db
      .from('real_estate_agents')
      .select('id, email, first_name, onboarding_completed')
      .eq('email_verified', true)
      .eq('activation_email_sent', false)
      .eq('onboarding_completed', false)
      .limit(limit)

    if (error) {
      logger.error('Error fetching stuck agents:', error)
      return NextResponse.json({ error: 'Database error', details: error.message }, { status: 500 })
    }

    if (!agents || agents.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No eligible agents found',
        sent: 0,
        failed: 0,
        skipped: 0
      })
    }

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dry_run: true,
        eligible_count: agents.length,
        agents: agents.map((a: any) => ({ id: a.id, email: a.email, first_name: a.first_name }))
      })
    }

    // Send activation emails with a small delay between sends to respect Resend rate limits
    const results = { sent: 0, failed: 0, errors: [] as string[] }

    for (const agent of agents as any[]) {
      try {
        const ok = await sendActivationEmail(agent.email, agent.id, agent.first_name)
        if (ok) {
          results.sent++
        } else {
          results.failed++
          results.errors.push(`${agent.email}: send returned false`)
        }
        // Small delay to avoid hammering the email provider
        await new Promise((r) => setTimeout(r, 100))
      } catch (err: any) {
        results.failed++
        results.errors.push(`${agent.email}: ${err.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      sent: results.sent,
      failed: results.failed,
      total_eligible: agents.length,
      errors: results.errors.length > 0 ? results.errors : undefined
    })
  } catch (err: any) {
    logger.error('Batch activation email error:', err)
    return NextResponse.json({ error: 'Unexpected error', details: err.message }, { status: 500 })
  }
}

/**
 * GET — returns count of agents eligible for activation email (monitoring)
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data, error } = await db
      .from('real_estate_agents')
      .select('id', { count: 'exact', head: true } as any)
      .eq('email_verified', true)
      .eq('activation_email_sent', false)
      .eq('onboarding_completed', false)

    if (error) {
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({
      eligible_count: (data as any)?.count ?? 0,
      description: 'Verified agents who have not completed onboarding and have not received an activation email'
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'Unexpected error', details: err.message }, { status: 500 })
  }
}
