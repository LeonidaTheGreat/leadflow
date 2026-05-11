import { getPlan } from './plans'
import type { PlanTier } from './plans'

export interface GateResult {
  allowed: boolean
  requiredTier?: PlanTier
  message?: string
}

export function canUseCalcom(tier: string): GateResult {
  const plan = getPlan(tier)
  if (plan?.gates.calcomBooking) return { allowed: true }
  return { allowed: false, requiredTier: 'pro', message: 'Cal.com appointment booking requires the Pro plan or higher.' }
}

export function canUseLeadRouting(tier: string): GateResult {
  const plan = getPlan(tier)
  if (plan?.gates.leadRouting) return { allowed: true }
  return { allowed: false, requiredTier: 'team', message: 'Lead routing requires the Team plan or higher.' }
}

export function canUseApi(tier: string): GateResult {
  const plan = getPlan(tier)
  if (plan?.gates.apiAccess) return { allowed: true }
  return { allowed: false, requiredTier: 'pro', message: 'API access requires the Pro plan or higher.' }
}

export function canUseWhiteLabel(tier: string): GateResult {
  const plan = getPlan(tier)
  if (plan?.gates.whiteLabel) return { allowed: true }
  return { allowed: false, requiredTier: 'brokerage', message: 'White-label branding requires the Brokerage plan.' }
}
