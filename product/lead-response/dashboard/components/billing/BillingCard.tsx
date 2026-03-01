'use client'

import { useState, useEffect } from 'react'
import { CreditCard, CheckCircle, AlertCircle, Loader2, Package, DollarSign } from 'lucide-react'
import { StripePortalButton } from './StripePortalButton'

interface BillingCardProps {
  agentId: string
  className?: string
}

interface BillingInfo {
  customerId: string | null
  subscriptionId: string | null
  planTier: string | null
  status: string
  mrr: number | null
}

export function BillingCard({ agentId, className = '' }: BillingCardProps) {
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchBillingInfo() {
      if (!agentId) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/stripe/portal-session?agentId=${agentId}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch billing info')
        }

        setBillingInfo(data.billingInfo)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch billing info'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBillingInfo()
  }, [agentId])

  const getPlanDisplayName = (tier: string | null) => {
    if (!tier) return 'No Plan'
    const names: Record<string, string> = {
      starter: 'Starter Plan',
      professional: 'Professional Plan',
      enterprise: 'Enterprise Plan',
    }
    return names[tier] || `${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan`
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
      trialing: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
      cancelled: 'text-slate-600 bg-slate-100 dark:bg-slate-800',
      past_due: 'text-red-600 bg-red-50 dark:bg-red-900/20',
      unpaid: 'text-red-600 bg-red-50 dark:bg-red-900/20',
      incomplete: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
    }
    return colors[status] || 'text-slate-600 bg-slate-100'
  }

  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 ${className}`}>
        <div className="flex items-start gap-3 text-red-600 dark:text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Failed to load billing info</p>
            <p className="text-sm text-red-500/80 mt-1">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  const hasSubscription = billingInfo?.subscriptionId && billingInfo.status !== 'cancelled'

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 ${className}`}>
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Billing & Subscription</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Manage your subscription, payment methods, and invoices
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Current Plan */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center shrink-0">
              <Package className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Current Plan</p>
              <p className="text-base font-semibold text-slate-900 dark:text-white mt-0.5">
                {getPlanDisplayName(billingInfo?.planTier)}
              </p>
              {billingInfo?.planTier && (
                <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                  {billingInfo.planTier === 'starter' && '$497/month'}
                  {billingInfo.planTier === 'professional' && '$997/month'}
                  {billingInfo.planTier === 'enterprise' && '$1,997/month'}
                </p>
              )}
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(billingInfo?.status || 'inactive')}`}>
            {billingInfo?.status === 'trialing' ? 'Trial' : billingInfo?.status || 'Inactive'}
          </span>
        </div>

        {/* MRR */}
        {hasSubscription && billingInfo?.mrr !== null && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Monthly Recurring Revenue</p>
              <p className="text-base font-semibold text-slate-900 dark:text-white mt-0.5">
                ${billingInfo.mrr?.toFixed(2)}/month
              </p>
            </div>
          </div>
        )}

        {/* Subscription Status */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
          {hasSubscription ? (
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Active Subscription</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Your subscription is active. You can update your payment method, change plans, or view invoices in the customer portal.
                </p>
              </div>
            </div>
          ) : billingInfo?.status === 'trialing' ? (
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Trial Period</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  You're currently on a trial. Set up billing to continue using all features after your trial ends.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-slate-900 dark:text-white">No Active Subscription</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  You don't have an active subscription. Upgrade to access all features.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Portal Button */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
          <StripePortalButton
            agentId={agentId}
            variant="primary"
            size="md"
            returnUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/settings`}
          />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage payment methods, update billing info, view invoices
          </p>
        </div>
      </div>
    </div>
  )
}
