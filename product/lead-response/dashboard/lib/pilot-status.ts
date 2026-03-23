/**
 * Pilot status utilities for free pilot onboarding.
 * 
 * Pilot agents get 60 days of full access with no credit card required.
 * After 60 days, the system pauses SMS sending for expired pilots.
 * Conversion to paid is handled manually by Stojan.
 */

export type PilotStatus = 'active' | 'expiring_soon' | 'expired' | 'converted' | 'not_pilot'

export interface PilotInfo {
  status: PilotStatus
  daysRemaining: number | null
  startedAt: string | null
  expiresAt: string | null
  planTier: string
}

/** Number of days before expiry to flag as "expiring_soon" */
const EXPIRY_WARNING_DAYS = 15

/**
 * Determine pilot status for an agent record.
 */
export function getPilotStatus(agent: {
  plan_tier?: string | null
  pilot_started_at?: string | null
  pilot_expires_at?: string | null
  stripe_customer_id?: string | null
}): PilotInfo {
  // Not a pilot agent
  if (agent.plan_tier !== 'pilot') {
    return {
      status: 'not_pilot',
      daysRemaining: null,
      startedAt: agent.pilot_started_at || null,
      expiresAt: agent.pilot_expires_at || null,
      planTier: agent.plan_tier || 'unknown',
    }
  }

  // If they have a stripe customer, they've been converted
  if (agent.stripe_customer_id) {
    return {
      status: 'converted',
      daysRemaining: null,
      startedAt: agent.pilot_started_at || null,
      expiresAt: agent.pilot_expires_at || null,
      planTier: agent.plan_tier,
    }
  }

  // No expiry date set (shouldn't happen but handle gracefully)
  if (!agent.pilot_expires_at) {
    return {
      status: 'active',
      daysRemaining: null,
      startedAt: agent.pilot_started_at || null,
      expiresAt: null,
      planTier: agent.plan_tier,
    }
  }

  const now = new Date()
  const expiresAt = new Date(agent.pilot_expires_at)
  const msRemaining = expiresAt.getTime() - now.getTime()
  const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000))

  if (daysRemaining <= 0) {
    return {
      status: 'expired',
      daysRemaining: 0,
      startedAt: agent.pilot_started_at || null,
      expiresAt: agent.pilot_expires_at,
      planTier: agent.plan_tier,
    }
  }

  if (daysRemaining <= EXPIRY_WARNING_DAYS) {
    return {
      status: 'expiring_soon',
      daysRemaining,
      startedAt: agent.pilot_started_at || null,
      expiresAt: agent.pilot_expires_at,
      planTier: agent.plan_tier,
    }
  }

  return {
    status: 'active',
    daysRemaining,
    startedAt: agent.pilot_started_at || null,
    expiresAt: agent.pilot_expires_at,
    planTier: agent.plan_tier,
  }
}

/**
 * Check if a pilot agent should have SMS sending paused.
 * Returns true if the pilot has expired and hasn't been converted.
 */
export function isPilotExpired(agent: {
  plan_tier?: string | null
  pilot_expires_at?: string | null
  stripe_customer_id?: string | null
}): boolean {
  if (agent.plan_tier !== 'pilot') return false
  if (agent.stripe_customer_id) return false // converted to paid
  if (!agent.pilot_expires_at) return false

  return new Date(agent.pilot_expires_at) < new Date()
}
