/**
 * POST /api/cron/inactivity-check
 *
 * Checks for pilot agents with >72h of inactivity and sends a Telegram alert.
 * De-duplicates: alerts fire at most once per 24h per agent.
 *
 * Run every 30 minutes via Vercel Cron or external scheduler.
 * Secured by CRON_SECRET header.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const INACTIVITY_THRESHOLD_MS = 72 * 60 * 60 * 1000  // 72 hours
const ALERT_DEDUP_MS          = 24 * 60 * 60 * 1000  // 24 hours
const CRON_SECRET = process.env.CRON_SECRET
const TELEGRAM_BOT_TOKEN = process.env.ORCHESTRATOR_BOT_TOKEN
const TELEGRAM_CHAT_ID   = process.env.TELEGRAM_CHAT_ID

async function sendTelegramAlert(text: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('[inactivity-check] Telegram not configured — skipping notification')
    return
  }
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' }),
  })
  if (!res.ok) {
    console.error('[inactivity-check] Telegram send failed:', await res.text())
  }
}

export async function POST(request: NextRequest) {
  // Auth: require CRON_SECRET if configured
  if (CRON_SECRET) {
    const secret = request.headers.get('x-cron-secret')
    if (secret !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const now = new Date()
  const inactivityCutoff = new Date(now.getTime() - INACTIVITY_THRESHOLD_MS).toISOString()
  const dedupCutoff      = new Date(now.getTime() - ALERT_DEDUP_MS).toISOString()

  try {
    // Find all agents whose last session activity was >72h ago
    const { data: inactiveSessions, error: sessionErr } = await supabase
      .from('agent_sessions')
      .select('agent_id, last_active_at')
      .lt('last_active_at', inactivityCutoff)
      .order('last_active_at', { ascending: false })

    if (sessionErr) {
      return NextResponse.json({ error: sessionErr.message }, { status: 500 })
    }

    if (!inactiveSessions || inactiveSessions.length === 0) {
      return NextResponse.json({ alerted: 0, message: 'No inactive pilots found' })
    }

    // Group to get the most-recent last_active_at per agent
    const agentMap = new Map<string, string>()
    for (const row of inactiveSessions) {
      if (!agentMap.has(row.agent_id)) {
        agentMap.set(row.agent_id, row.last_active_at)
      }
    }

    let alerted = 0
    for (const [agentId, lastActive] of agentMap.entries()) {
      // Check for recent alert (de-duplicate within 24h)
      const { data: recentAlert } = await supabase
        .from('inactivity_alerts')
        .select('id')
        .eq('agent_id', agentId)
        .gte('alerted_at', dedupCutoff)
        .limit(1)
        .single()

      if (recentAlert) continue  // already alerted within 24h

      // Fetch agent name for the message
      const { data: agent } = await supabase
        .from('real_estate_agents')
        .select('first_name, last_name, email')
        .eq('id', agentId)
        .single()

      const name = agent
        ? `${agent.first_name ?? ''} ${agent.last_name ?? ''}`.trim() || agent.email
        : agentId

      const lastSeenDate = new Date(lastActive)
      const hoursInactive = Math.floor((now.getTime() - lastSeenDate.getTime()) / (1000 * 60 * 60))
      const daysInactive  = Math.floor(hoursInactive / 24)
      const lastSeenStr   = lastSeenDate.toLocaleDateString('en-CA', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })

      const message = `⚠️ <b>${name}</b> hasn't logged in for ${daysInactive > 0 ? `${daysInactive} day(s)` : `${hoursInactive} hour(s)`}.\nLast seen: ${lastSeenStr}`

      await sendTelegramAlert(message)

      // Record alert to prevent duplicates
      await supabase.from('inactivity_alerts').insert({
        agent_id: agentId,
        alerted_at: now.toISOString(),
        channel: 'telegram',
      })

      alerted++
    }

    return NextResponse.json({ alerted, checked: agentMap.size })
  } catch (error) {
    console.error('[inactivity-check] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Also support GET for easy health checks / Vercel cron (which uses GET)
export async function GET(request: NextRequest) {
  return POST(request)
}
