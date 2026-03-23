import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase, isSupabaseConfigured } from '@/lib/supabase-server'

/**
 * GET /api/cron/inactivity-alerts
 *
 * FR-5: Inactivity Alerting Cron
 *
 * Runs every 30 minutes via Vercel Cron.
 * Checks for pilot agents inactive > 72 hours (via agent_sessions.last_active_at).
 * De-duplicates via inactivity_alerts table (no duplicate within 24h per agent).
 * Sends Telegram notification and inserts alert row.
 *
 * Deduplication logic:
 *  - Query agent_sessions for sessions with last_active_at < now() - 72h
 *  - For each inactive agent, check inactivity_alerts for an alert in the last 24h
 *  - If none found, send Telegram message and insert alert row
 */

const INACTIVITY_THRESHOLD_HOURS = 72
const DEDUP_WINDOW_HOURS = 24

async function sendTelegramAlert(
  agentId: string,
  agentEmail: string,
  agentName: string,
  lastActiveAt: string
): Promise<boolean> {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('[inactivity-alerts] Telegram not configured — skipping notification')
    return false
  }

  const lastActiveDate = new Date(lastActiveAt)
  const hoursInactive = Math.floor(
    (Date.now() - lastActiveDate.getTime()) / (1000 * 60 * 60)
  )

  const message = `
⚠️ <b>Pilot Agent Inactivity Alert</b>

👤 <b>Agent:</b> ${agentName} (${agentEmail})
🆔 <b>ID:</b> ${agentId}
⏰ <b>Last Active:</b> ${lastActiveDate.toLocaleString('en-US', { timeZone: 'America/Toronto' })}
🕐 <b>Inactive for:</b> ${hoursInactive}h

This pilot agent has not logged in or had any session activity in over ${INACTIVITY_THRESHOLD_HOURS} hours.

<a href="https://leadflow-ai-five.vercel.app/admin">View in Admin Dashboard</a>
  `.trim()

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
      console.error('[inactivity-alerts] Telegram send failed:', body)
      return false
    }

    console.log(`[inactivity-alerts] Telegram alert sent for agent ${agentId}`)
    return true
  } catch (err) {
    console.error('[inactivity-alerts] Telegram request error:', err)
    return false
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
    }

    const isDryRun = request.nextUrl.searchParams.get('test') === 'true'
    if (isDryRun) {
      console.log('[inactivity-alerts] 🧪 DRY-RUN mode')
    }

    const inactivityCutoff = new Date(
      Date.now() - INACTIVITY_THRESHOLD_HOURS * 60 * 60 * 1000
    ).toISOString()

    const dedupCutoff = new Date(
      Date.now() - DEDUP_WINDOW_HOURS * 60 * 60 * 1000
    ).toISOString()

    // Find agents with sessions inactive > 72h
    // Join against real_estate_agents to get agent details
    const { data: inactiveSessions, error: sessionsError } = await supabase
      .from('agent_sessions')
      .select(`
        agent_id,
        last_active_at,
        real_estate_agents!agent_sessions_agent_id_fkey (
          id,
          email,
          first_name,
          last_name
        )
      `)
      .lt('last_active_at', inactivityCutoff)
      .order('last_active_at', { ascending: true })

    if (sessionsError) {
      console.error('[inactivity-alerts] Error fetching inactive sessions:', sessionsError)
      return NextResponse.json(
        { error: 'Failed to fetch inactive sessions', details: sessionsError.message },
        { status: 500 }
      )
    }

    if (!inactiveSessions || inactiveSessions.length === 0) {
      console.log('[inactivity-alerts] No inactive agents found')
      return NextResponse.json({
        success: true,
        message: 'No inactive agents found',
        checked: 0,
        alerted: 0,
        skipped: 0,
      })
    }

    // Deduplicate by agent_id — keep only the most recent session per agent
    const agentMap = new Map<string, { last_active_at: string; agent: any }>()
    for (const session of inactiveSessions) {
      const agentId = session.agent_id
      if (!agentId) continue
      const existing = agentMap.get(agentId)
      if (!existing || session.last_active_at > existing.last_active_at) {
        agentMap.set(agentId, {
          last_active_at: session.last_active_at,
          agent: (session as any).real_estate_agents,
        })
      }
    }

    console.log(`[inactivity-alerts] Found ${agentMap.size} unique inactive agents`)

    let alerted = 0
    let skipped = 0
    const results: Array<{
      agent_id: string
      email: string
      last_active_at: string
      action: 'alerted' | 'skipped' | 'dry_run'
      reason?: string
    }> = []

    for (const [agentId, { last_active_at, agent }] of agentMap) {
      const email = agent?.email || 'unknown'
      const name = agent
        ? `${agent.first_name || ''} ${agent.last_name || ''}`.trim() || email
        : email

      // Check dedup: was an alert already sent within the last 24h?
      const { data: recentAlerts, error: alertCheckError } = await supabase
        .from('inactivity_alerts')
        .select('id, alerted_at')
        .eq('agent_id', agentId)
        .gte('alerted_at', dedupCutoff)
        .limit(1)

      if (alertCheckError) {
        console.error(
          `[inactivity-alerts] Error checking dedup for agent ${agentId}:`,
          alertCheckError.message
        )
        skipped++
        results.push({
          agent_id: agentId,
          email,
          last_active_at,
          action: 'skipped',
          reason: 'dedup_check_failed',
        })
        continue
      }

      if (recentAlerts && recentAlerts.length > 0) {
        console.log(
          `[inactivity-alerts] Skipping agent ${agentId} — alert sent at ${recentAlerts[0].alerted_at}`
        )
        skipped++
        results.push({
          agent_id: agentId,
          email,
          last_active_at,
          action: 'skipped',
          reason: 'already_alerted_within_24h',
        })
        continue
      }

      // Dry-run: don't send or insert
      if (isDryRun) {
        console.log(
          `[inactivity-alerts] 🧪 [DRY-RUN] Would alert for agent ${agentId} (${email}), last_active_at: ${last_active_at}`
        )
        results.push({
          agent_id: agentId,
          email,
          last_active_at,
          action: 'dry_run',
        })
        continue
      }

      // Send Telegram notification
      await sendTelegramAlert(agentId, email, name, last_active_at)

      // Insert alert row (regardless of Telegram success — record that we attempted)
      const { error: insertError } = await supabase.from('inactivity_alerts').insert({
        agent_id: agentId,
        alerted_at: new Date().toISOString(),
        channel: 'telegram',
      })

      if (insertError) {
        console.error(
          `[inactivity-alerts] Failed to insert alert record for ${agentId}:`,
          insertError.message
        )
        // Still count as alerted since Telegram was sent
      }

      alerted++
      results.push({
        agent_id: agentId,
        email,
        last_active_at,
        action: 'alerted',
      })
    }

    console.log(
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
  } catch (error: any) {
    console.error('[inactivity-alerts] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
