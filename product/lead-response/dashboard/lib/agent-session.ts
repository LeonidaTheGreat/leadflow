/**
 * Agent Session Logging — thin wrapper over AuthService
 *
 * All session management logic lives in AuthService.
 * This module delegates to authService and handles error logging
 * with the [agent-session] prefix so callers are never broken.
 *
 * CRITICAL: session logging failures must NEVER break the authentication flow.
 */
import { NextRequest } from 'next/server'
import { authService, AuthService } from '@/lib/services/AuthService'

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
  return AuthService.getClientIp(req)
}

/**
 * Log the start of an authenticated agent session.
 *
 * Returns the session record on success, or null if the insert fails.
 * Failures are logged but never thrown — auth must not break.
 */
export async function logSessionStart(
  agentId: string,
  req: NextRequest
): Promise<AgentSessionRecord | null> {
  try {
    const ipAddress = getClientIp(req)
    const userAgent = req.headers.get('user-agent') || null
    return await authService.logAgentSessionStart(agentId, ipAddress, userAgent) as AgentSessionRecord
  } catch (err: any) {
    if (err?.message !== undefined && err?.code !== undefined) {
      // DB-returned error with message + code
      console.error('[agent-session] logSessionStart failed:', err.message, {
        agentId,
        code: err.code,
      })
    } else {
      console.error('[agent-session] logSessionStart unexpected error:', err)
    }
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
    return await authService.touchAgentSession(sessionId)
  } catch (err: any) {
    if (err?.message !== undefined) {
      console.error('[agent-session] touchSession failed:', err.message, { sessionId })
    } else {
      console.error('[agent-session] touchSession unexpected error:', err)
    }
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
    return await authService.touchAgentSessionByAgentId(agentId)
  } catch (err: any) {
    if (err?.message !== undefined) {
      console.error('[agent-session] touchSessionByAgentId failed:', err.message, { agentId })
    } else {
      console.error('[agent-session] touchSessionByAgentId unexpected error:', err)
    }
    return false
  }
}
