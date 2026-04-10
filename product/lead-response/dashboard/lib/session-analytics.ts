/**
 * Session Analytics — thin wrapper over AuthService
 *
 * All session management logic lives in AuthService.
 * This module delegates to authService and provides the
 * public API expected by callers (route handlers, components).
 *
 * All DB errors are caught silently — session analytics must never break auth.
 */

import { authService, TRACKED_PAGES } from '@/lib/services/AuthService'

export { TRACKED_PAGES }

// In-memory rate limiter for touchSession (1 write per 60s per session)
const touchSessionCache = new Map<string, number>()
const TOUCH_RATE_LIMIT_MS = 60_000

/** Log a new session on agent login. Returns the session_id or null on failure. */
export async function logSessionStart(
  agentId: string,
  ipAddress?: string | null,
  userAgent?: string | null
): Promise<string | null> {
  try {
    const record = await authService.logAgentSessionStart(agentId, ipAddress ?? null, userAgent ?? null)
    return record?.id ?? null
  } catch {
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
    await authService.touchAgentSession(sessionId)
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
  await authService.logPageView(agentId, sessionId, page)
}

/** End a session (set session_end). */
export async function endSession(sessionId: string): Promise<void> {
  await authService.endAgentSession(sessionId)
}
