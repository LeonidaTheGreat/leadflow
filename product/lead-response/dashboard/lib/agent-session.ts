/**
 * Agent Session Logging
 *
 * Provides logSessionStart() to insert a row into agent_sessions on successful login.
 * Per FR-1 of PRD-SESSION-ANALYTICS-PILOT.
 *
 * CRITICAL: session logging failures must NEVER break the authentication flow.
 * All DB errors are caught and logged; the function returns null on failure.
 */
import { createClient } from '@/lib/db'
import { NextRequest } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface AgentSessionRecord {
  id: string
  agentId: string
  sessionStart: string
  lastActiveAt: string
  ipAddress: string | null
  userAgent: string | null
}

/**
 * Extract the real client IP from request headers.
 * Handles proxies (Vercel sets x-forwarded-for).
 */
export function getClientIp(req: NextRequest): string | null {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    // x-forwarded-for can be comma-separated; first value is the originating client
    return xff.split(',')[0].trim() || null
  }
  return req.headers.get('x-real-ip') || null
}

/**
 * Log the start of an authenticated agent session.
 *
 * Inserts a row into agent_sessions with:
 *   - agent_id: the authenticated agent's UUID
 *   - session_start: now()
 *   - last_active_at: now()
 *   - ip_address: extracted from request headers
 *   - user_agent: from User-Agent header
 *
 * Returns the session record (including its UUID) on success, or null if the
 * insert fails. Failures are logged but never thrown — auth must not break.
 */
export async function logSessionStart(
  agentId: string,
  req: NextRequest
): Promise<AgentSessionRecord | null> {
  try {
    const now = new Date().toISOString()
    const ipAddress = getClientIp(req)
    const userAgent = req.headers.get('user-agent') || null

    const { data, error } = await supabase
      .from('agent_sessions')
      .insert({
        agent_id: agentId,
        session_start: now,
        last_active_at: now,
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select('id, agent_id, session_start, last_active_at, ip_address, user_agent')
      .single()

    if (error) {
      // Log the error but do NOT throw — login must succeed even if session logging fails
      console.error('[agent-session] logSessionStart failed:', error.message, {
        agentId,
        code: error.code,
      })
      return null
    }

    return {
      id: data.id,
      agentId: data.agent_id,
      sessionStart: data.session_start,
      lastActiveAt: data.last_active_at,
      ipAddress: data.ip_address,
      userAgent: data.user_agent,
    }
  } catch (err) {
    // Catch unexpected errors (network, env vars missing, etc.)
    console.error('[agent-session] logSessionStart unexpected error:', err)
    return null
  }
}

/**
 * Update last_active_at for an existing session (session heartbeat - FR-2).
 * Rate-limiting to at most 1 DB write per 60s per session is the caller's responsibility.
 *
 * Returns true on success, false on failure (never throws).
 */
export async function touchSession(sessionId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('agent_sessions')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', sessionId)

    if (error) {
      console.error('[agent-session] touchSession failed:', error.message, { sessionId })
      return false
    }
    return true
  } catch (err) {
    console.error('[agent-session] touchSession unexpected error:', err)
    return false
  }
}

/**
 * Update last_active_at for all active sessions belonging to an agent (session heartbeat - FR-2).
 *
 * Used by middleware when only the agent_id (from JWT userId claim) is available,
 * rather than a specific agent_sessions row id.
 *
 * Returns true on success, false on failure (never throws).
 */
export async function touchSessionByAgentId(agentId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('agent_sessions')
      .update({ last_active_at: new Date().toISOString() })
      .eq('agent_id', agentId)

    if (error) {
      console.error('[agent-session] touchSessionByAgentId failed:', error.message, { agentId })
      return false
    }
    return true
  } catch (err) {
    console.error('[agent-session] touchSessionByAgentId unexpected error:', err)
    return false
  }
}
