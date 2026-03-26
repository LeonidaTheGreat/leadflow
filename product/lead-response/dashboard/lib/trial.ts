import { createClient } from '@/lib/db'
import jwt from 'jsonwebtoken'

const supabase = createClient(
  process.env.NEXT_PUBLIC_API_URL || 'https://api.imagineapi.org',
  process.env.API_SECRET_KEY || process.env.NEXT_PUBLIC_API_KEY || ''
)

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export interface TrialStatus {
  isTrial: boolean
  isExpired: boolean
  trialEndsAt: string | null
  daysRemaining: number
}

/**
 * Check if a user's trial has expired
 * Returns trial status for the given user ID
 */
export async function checkTrialStatus(userId: string): Promise<TrialStatus> {
  const { data: agent, error } = await supabase
    .from('real_estate_agents')
    .select('plan_tier, trial_ends_at')
    .eq('id', userId)
    .single()

  if (error || !agent) {
    return {
      isTrial: false,
      isExpired: false,
      trialEndsAt: null,
      daysRemaining: 0
    }
  }

  const isTrial = agent.plan_tier === 'trial'
  
  if (!isTrial) {
    return {
      isTrial: false,
      isExpired: false,
      trialEndsAt: agent.trial_ends_at,
      daysRemaining: 0
    }
  }

  const now = new Date()
  const trialEndsAt = agent.trial_ends_at ? new Date(agent.trial_ends_at) : null
  const isExpired = trialEndsAt ? now > trialEndsAt : false
  const daysRemaining = trialEndsAt 
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0

  return {
    isTrial: true,
    isExpired,
    trialEndsAt: agent.trial_ends_at,
    daysRemaining
  }
}

/**
 * Validate JWT token and extract payload
 */
export function validateJWTToken(token: string): { userId: string; email: string } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; email: string }
    return payload
  } catch {
    return null
  }
}

/**
 * Check if an agent can send SMS (not expired trial)
 */
export async function canSendSms(agentId: string): Promise<{ allowed: boolean; reason?: string }> {
  const trialStatus = await checkTrialStatus(agentId)
  
  if (trialStatus.isTrial && trialStatus.isExpired) {
    return {
      allowed: false,
      reason: 'Trial expired. Please upgrade to continue sending SMS.'
    }
  }
  
  return { allowed: true }
}

/**
 * Get all expired trial agents
 * Useful for scheduled jobs to batch process expired trials
 */
export async function getExpiredTrialAgents(): Promise<string[]> {
  const now = new Date().toISOString()
  
  const { data: agents, error } = await supabase
    .from('real_estate_agents')
    .select('id')
    .eq('plan_tier', 'trial')
    .lt('trial_ends_at', now)

  if (error || !agents) {
    console.error('Error fetching expired trial agents:', error)
    return []
  }

  return agents.map(a => a.id)
}
