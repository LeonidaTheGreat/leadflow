'use client'

import { useState } from 'react'
import { Loader2, ArrowRight } from 'lucide-react'

interface UpgradeButtonProps {
  plan: 'starter' | 'pro' | 'team'
  label?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'secondary' | 'outline'
}

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
}

const variantClasses = {
  primary:
    'bg-emerald-500 hover:bg-emerald-400 text-white disabled:bg-emerald-300',
  secondary:
    'bg-slate-800 hover:bg-slate-700 text-white disabled:bg-slate-500',
  outline:
    'border border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20 disabled:opacity-50',
}

/**
 * UpgradeButton — initiates a Stripe Checkout session for a pilot-to-paid upgrade.
 *
 * Calls POST /api/stripe/upgrade-checkout with the selected plan, then
 * redirects the user to the Stripe-hosted checkout page.
 */
export function UpgradeButton({
  plan,
  label,
  className = '',
  size = 'md',
  variant = 'primary',
}: UpgradeButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const planLabels: Record<string, string> = {
    starter: 'Upgrade to Starter',
    pro: 'Upgrade to Pro',
    team: 'Upgrade to Team',
  }

  const handleUpgrade = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/stripe/upgrade-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to start checkout')
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setError(msg)
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className={`
          inline-flex items-center justify-center gap-2 font-semibold rounded-lg
          transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2
          disabled:cursor-not-allowed
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          ${className}
        `}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Redirecting to checkout…
          </>
        ) : (
          <>
            {label ?? planLabels[plan]}
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      {error && (
        <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}
