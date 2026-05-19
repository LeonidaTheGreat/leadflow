'use client'

import type { ReactNode } from 'react'
import { Lock, ArrowRight, Sparkles } from 'lucide-react'
import Link from 'next/link'
import type { PlanFeatureFlags, PlanTier } from '@/lib/plans'
import { minimumTierFor, getPlan, canUse } from '@/lib/plans'

interface FeatureGateProps {
  /** The feature flag key being gated */
  feature: keyof PlanFeatureFlags
  /** Current user plan tier (from session) */
  currentTier: PlanTier
  /** Optional: render mode. 'inline' = banner inside a card; 'overlay' = full overlay */
  mode?: 'inline' | 'overlay'
  /** Feature display name shown to the user (e.g. "Cal.com booking") */
  featureName?: string
  children?: ReactNode
}

const FEATURE_NAMES: Record<keyof PlanFeatureFlags, string> = {
  calcom: 'Cal.com booking automation',
  leadRouting: 'Lead routing & distribution',
  api: 'API access',
  whiteLabel: 'White-label branding',
}

/**
 * FeatureGate — wraps content or surfaces an upgrade prompt when the user's
 * plan doesn't include the requested feature.
 *
 * Usage (inline banner):
 *   <FeatureGate feature="calcom" currentTier="starter" mode="inline" featureName="Cal.com booking">
 *     <CalComSettings />
 *   </FeatureGate>
 *
 * Usage (overlay — wraps a section and dims + locks it):
 *   <FeatureGate feature="leadRouting" currentTier="starter" mode="overlay">
 *     <LeadRoutingPanel />
 *   </FeatureGate>
 */
export function FeatureGate({
  feature,
  currentTier,
  mode = 'inline',
  featureName,
  children,
}: FeatureGateProps) {
  const requiredTier = minimumTierFor(feature)
  const requiredPlan = getPlan(requiredTier)
  const displayName = featureName ?? FEATURE_NAMES[feature]

  // User has access — render children normally
  if (canUse(feature, currentTier)) {
    return <>{children}</>
  }

  if (mode === 'overlay') {
    return (
      <div className="relative" data-testid={`feature-gate-overlay-${feature}`}>
        {/* Blurred children — visual hint that content exists */}
        <div className="pointer-events-none select-none blur-sm opacity-50" aria-hidden>
          {children}
        </div>

        {/* Lock overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <FeatureGateCard
            displayName={displayName}
            requiredPlan={requiredPlan}
            compact={false}
          />
        </div>
      </div>
    )
  }

  // mode === 'inline'
  return (
    <div data-testid={`feature-gate-inline-${feature}`}>
      <FeatureGateCard
        displayName={displayName}
        requiredPlan={requiredPlan}
        compact={true}
      />
    </div>
  )
}

interface FeatureGateCardProps {
  displayName: string
  requiredPlan: ReturnType<typeof getPlan>
  compact: boolean
}

function FeatureGateCard({ displayName, requiredPlan, compact }: FeatureGateCardProps) {
  const isBrokerage = requiredPlan.tier === 'brokerage'
  const upgradeHref = isBrokerage
    ? 'mailto:hello@leadflow.ai?subject=Brokerage%20Plan%20Inquiry'
    : '/dashboard/pricing'

  if (compact) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/10 p-4">
        <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            {displayName} is available on {requiredPlan.name}+
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
            Upgrade to unlock this feature.
          </p>
        </div>
        <Link
          href={upgradeHref}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors"
          data-testid="feature-gate-upgrade-cta"
        >
          Upgrade
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    )
  }

  // Full overlay card
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-8 max-w-sm w-full mx-4 text-center">
      <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
        <Lock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
      </div>

      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold mb-3">
        <Sparkles className="w-3 h-3" />
        {requiredPlan.name} feature
      </div>

      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
        {displayName}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        {isBrokerage
          ? 'Contact our sales team to learn about Brokerage plans.'
          : `This feature is available on ${requiredPlan.name} and above. Upgrade to unlock it.`}
      </p>

      <Link
        href={upgradeHref}
        className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors"
        data-testid="feature-gate-upgrade-cta"
      >
        {isBrokerage ? 'Contact Sales' : `Upgrade to ${requiredPlan.name}`}
        <ArrowRight className="w-4 h-4" />
      </Link>

      {!isBrokerage && (
        <p className="text-xs text-slate-400 mt-3">
          ${requiredPlan.monthlyPrice}/month · Cancel anytime
        </p>
      )}
    </div>
  )
}
