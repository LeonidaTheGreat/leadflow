'use strict'

import { PLAN_FEATURES, type PlanTier } from './plans'

// Pure gate functions — no DB calls. Pass plan_tier from the DB directly.
// Tiers trial and pilot receive Pro-level access so users can evaluate the product.

export function canUseCalcom(planTier: string | null | undefined): boolean {
  if (!planTier) return false
  return (PLAN_FEATURES.calcom as readonly string[]).includes(planTier)
}

export function canUseLeadRouting(planTier: string | null | undefined): boolean {
  if (!planTier) return false
  return (PLAN_FEATURES.leadRouting as readonly string[]).includes(planTier)
}

export function canUseApi(planTier: string | null | undefined): boolean {
  if (!planTier) return false
  return (PLAN_FEATURES.apiAccess as readonly string[]).includes(planTier)
}

export function canUseWhiteLabel(planTier: string | null | undefined): boolean {
  if (!planTier) return false
  return (PLAN_FEATURES.whiteLabel as readonly string[]).includes(planTier)
}

export function canUseTeamAnalytics(planTier: string | null | undefined): boolean {
  if (!planTier) return false
  return (PLAN_FEATURES.teamAnalytics as readonly string[]).includes(planTier)
}

export function canUseUnlimitedSms(planTier: string | null | undefined): boolean {
  if (!planTier) return false
  return (PLAN_FEATURES.unlimitedSms as readonly string[]).includes(planTier)
}

// Returns a standardized 403 payload for use in API routes.
export function tierGateError(feature: string, requiredPlan: PlanTier): { error: string; requiredPlan: PlanTier; upgradeUrl: string } {
  return {
    error: `${feature} requires the ${requiredPlan} plan or higher`,
    requiredPlan,
    upgradeUrl: '/pricing',
  }
}
