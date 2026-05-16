import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase, isSupabaseConfigured } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'

/**
 * GET /api/cron/inactivity-alerts
 *
 * FR-5: Inactivity Alerting Cron
 *
 * Runs every 30 minutes via Vercel Cron.
 * Checks for pilot agents inactive > 72 hours (via agent_sessions.last_used_at).
 * De-duplicates via inactivity_alerts table (no duplicate within 24h per agent).
 * Sends Telegram notification and inserts alert row.
 *
 * Schema:
 *  - agent_sessions: agent_id (uuid), last_used_at (timestamptz)
 *  - inactivity_alerts: agent_id (uuid), alert_type (text), message (text),
 *                        resolved (boolean), alerted_at (timestamptz), channel (text)
 *                        (alerted_at + channel added by migration 046)
 *
 * Deduplication logic:
 *  - Query agent_sessions for sessions with last_used_at < now() - 72h
 *  - For each inactive agent, check inactivity_alerts.alerted_at within last 24h
 *  - If no recent alert: send Telegram + insert inactivity_alerts row
 */

const INACTIVITY_THRESHOLD_HOURS = 72
const DEDUP_WINDOW_HOURS = 24

async function sendTelegramAlert(
  agentId: string,
  agentEmail: string,
  agentName: string,
  lastUsedAt: string
): Promise<boolean> {
  const TELEGRAM_BOT_TOKEN = process.env.ORCHESTRATOR_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    logger.warn('[inactivity-alerts] Telegram not configured — skipping notification')
    return false
  }

  const lastUsedDate = new Date(lastUsedAt)
  const hoursInactive = Math.floor(
    (Date.now() - lastUsedDate.getTime()) / (1000 * 60 * 60)
  )
  const daysInactive = Math.floor(hoursInactive / 24)
  const inactiveStr = daysInactive > 0
    ? `${daysInactive} day${daysInactive !== 1 ? 's' : ''}`
    : `${hoursInactive} hour${hoursInactive !== 1 ? 's' : ''}`

  const message = [
    '⚠️ <b>Pilot Agent Inactivity Alert</b>',
    '',
    `👤 <b>Agent:</b> ${agentName} (${agentEmail})`,
    `🆔 <b>ID:</b> ${agentId}`,
    `⏰ <b>Last Active:</b> ${lastUsedDate.toLocaleString('en-US', { timeZone: 'America/Toronto' })}`,
    `🕐 <b>Inactive for:</b> ${inactiveStr}`,
    '',
    `This pilot agent has not had any session activity in over ${INACTIVITY_THRESHOLD_HOURS} hours.`,
    '',
    '<a href="https://leadflow-ai-five.vercel.app/admin">View in Admin Dashboard</a>',
  ].join('\n')

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      }
    )

    if (!response.ok) {
      const body = await response.text()
      logger.error('[inactivity-alerts] Telegram send failed:', body)
      return false
    }

    logger.info(`[inactivity-alerts] Telegram alert sent for agent ${agentId}`)
    return true
  } catch (err) {
    logger.error('[inactivity-alerts] Telegram request error:', err)
    return false
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
    }
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    const isDryRun = request.nextUrl.searchParams.get('test') === 'true'
    if (isDryRun) {
      logger.info('[inactivity-alerts] DRY-RUN mode')
    }

    const inactivityCutoff = new Date(
      Date.now() - INACTIVITY_THRESHOLD_HOURS * 60 * 60 * 1000
    ).toISOString()

    const dedupCutoff = new Date(
      Date.now() - DEDUP_WINDOW_HOURS * 60 * 60 * 1000
    ).toISOString()

    // Find all sessions where last_used_at is older than 72h
    const { data: inactiveSessions, error: sessionsError } = await supabase
      .from('agent_sessions')
      .select('agent_id, last_used_at')
      .lt('last_used_at', inactivityCutoff)
      .order('last_used_at', { ascending: true })

    if (sessionsError) {
      logger.error('[inactivity-alerts] Error fetching inactive sessions:', sessionsError)
      return NextResponse.json(
        { error: 'Failed to fetch inactive sessions' },
        { status: 500 }
      )
    }

    if (!inactiveSessions || inactiveSessions.length === 0) {
      logger.info('[inactivity-alerts] No inactive agents found')
      return NextResponse.json({
        success: true,
        message: 'No inactive agents found',
        checked: 0,
        alerted: 0,
        skipped: 0,
      })
    }

    // Deduplicate by agent_id — keep the most recent last_used_at per agent
    const agentMap = new Map<string, string>()
    for (const session of inactiveSessions) {
      const agentId = session.agent_id as string
      if (!agentId) continue
      const existing = agentMap.get(agentId)
      const sessionTs = session.last_used_at as string
      if (!existing || sessionTs > existing) {
        agentMap.set(agentId, sessionTs)
      }
    }

    logger.info(`[inactivity-alerts] Found ${agentMap.size} unique inactive agents`)

    let alerted = 0
    let skipped = 0
    const results: Array<{
      agent_id: string
      email: string
      last_used_at: string
      action: 'alerted' | 'skipped' | 'dry_run'
      reason?: string
    }> = []

    for (const [agentId, lastUsedAt] of agentMap) {
      // Check dedup: was an alert already sent within the last 24h?
      // Use alerted_at (indexed) for efficient dedup window queries
      const { data: recentAlerts, error: alertCheckError } = await supabase
        .from('inactivity_alerts')
        .select('id, alerted_at')
        .eq('agent_id', agentId)
        .eq('alert_type', 'inactivity_72h')
        .gte('alerted_at', dedupCutoff)
        .limit(1)

      if (alertCheckError) {
        logger.error(
          `[inactivity-alerts] Error checking dedup for agent ${agentId}:`,
          alertCheckError.message
        )
        skipped++
        results.push({
          agent_id: agentId,
          email: agentId,
          last_used_at: lastUsedAt,
          action: 'skipped',
          reason: 'dedup_check_failed',
        })
        continue
      }

      if (recentAlerts && recentAlerts.length > 0) {
        const sentAt = (recentAlerts[0] as any).alerted_at as string
        logger.info(
          `[inactivity-alerts] Skipping agent ${agentId} — alert sent at ${sentAt}`
        )
        skipped++
        results.push({
          agent_id: agentId,
          email: agentId,
          last_used_at: lastUsedAt,
          action: 'skipped',
          reason: 'already_alerted_within_24h',
        })
        continue
      }

      // Fetch agent details (separate query — PostgREST client doesn't support nested joins)
      const { data: agentData } = await supabase
        .from('real_estate_agents')
        .select('email, first_name, last_name')
        .eq('id', agentId)
        .limit(1)

      const agent = agentData && agentData.length > 0 ? agentData[0] : null
      const email = (agent as any)?.email || 'unknown'
      const name = agent
        ? `${(agent as any).first_name || ''} ${(agent as any).last_name || ''}`.trim() || email
        : email

      // Dry-run: don't send or insert
      if (isDryRun) {
        logger.info(
          `[inactivity-alerts] [DRY-RUN] Would alert agent ${agentId} (${email}), last_used_at: ${lastUsedAt}`
        )
        results.push({
          agent_id: agentId,
          email,
          last_used_at: lastUsedAt,
          action: 'dry_run',
        })
        continue
      }

      // Build alert message for the record
      const hoursInactive = Math.floor(
        (Date.now() - new Date(lastUsedAt).getTime()) / (1000 * 60 * 60)
      )
      const alertMessage = `Agent ${name} (${email}) has been inactive for ${hoursInactive}h (last session: ${lastUsedAt})`

      // Send Telegram notification
      await sendTelegramAlert(agentId, email, name, lastUsedAt)

      // Insert alert row — alerted_at and channel added by migration 046
      const { error: insertError } = await supabase.from('inactivity_alerts').insert({
        agent_id: agentId,
        alert_type: 'inactivity_72h',
        message: alertMessage,
        resolved: false,
        alerted_at: new Date().toISOString(),
        channel: 'telegram',
      })

      if (insertError) {
        logger.error(
          `[inactivity-alerts] Failed to insert alert record for ${agentId}:`,
          insertError.message
        )
        // Still count as alerted since Telegram was sent
      }

      alerted++
      results.push({
        agent_id: agentId,
        email,
        last_used_at: lastUsedAt,
        action: 'alerted',
      })
    }

    logger.info(
      `[inactivity-alerts] Done — alerted: ${alerted}, skipped: ${skipped}, dry_run: ${isDryRun}`
    )

    return NextResponse.json({
      success: true,
      checked: agentMap.size,
      alerted,
      skipped,
      dry_run: isDryRun,
      results,
    })
  } catch (error: unknown) {
    logger.error('[inactivity-alerts] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
