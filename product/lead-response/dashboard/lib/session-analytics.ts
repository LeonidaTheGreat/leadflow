/**
 * Session Analytics — Pilot Usage Tracking
 *
 * Utilities for logging agent sessions, page views, and inactivity alerts.
 * All DB errors are caught silently — session analytics must never break auth.
 */

import { createClient } from '@/lib/db'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// In-memory rate limiter for touchSession (1 write per 60s per session)
const touchSessionCache = new Map<string, number>()
const TOUCH_RATE_LIMIT_MS = 60_000

// Dashboard pages we track
export const TRACKED_PAGES = [
  '/dashboard',
  '/dashboard/conversations',
  '/dashboard/settings',
  '/dashboard/billing',
]

/** Log a new session on agent login. Returns the session_id or null on failure. */
export async function logSessionStart(
  agentId: string,
  ipAddress?: string | null,
  userAgent?: string | null
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('agent_sessions')
      .insert({
        agent_id: agentId,
        ip_address: ipAddress ?? null,
        user_agent: userAgent ?? null,
        session_start: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error || !data) return null
    return data.id as string
  } catch {
    // Fail silently — never break login
    return null
  }
}

/** Update last_active_at for a session. Rate-limited to 1 write per 60s. */
export async function touchSession(sessionId: string): Promise<void> {
  try {
    const now = Date.now()
    const lastTouch = touchSessionCache.get(sessionId) ?? 0

    if (now - lastTouch < TOUCH_RATE_LIMIT_MS) return

    touchSessionCache.set(sessionId, now)

    await supabase
      .from('agent_sessions')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', sessionId)
  } catch {
    // Fail silently
  }
}

/** Log a page view for an agent session. */
export async function logPageView(
  agentId: string,
  sessionId: string,
  page: string
): Promise<void> {
  try {
    // Only track dashboard pages in scope
    const normalised = page.split('?')[0] // strip query string
    if (!TRACKED_PAGES.some(p => normalised === p || normalised.startsWith(p + '/'))) return

    await supabase.from('agent_page_views').insert({
      agent_id: agentId,
      session_id: sessionId,
      page: normalised,
      visited_at: new Date().toISOString(),
    })
  } catch {
    // Fail silently
  }
}

/** End a session (set session_end). */
export async function endSession(sessionId: string): Promise<void> {
  try {
    await supabase
      .from('agent_sessions')
      .update({ session_end: new Date().toISOString() })
      .eq('id', sessionId)
  } catch {
    // Fail silently
  }
}
