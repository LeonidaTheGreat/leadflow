'use client'

import { useState } from 'react'
import { ArrowRight, Zap, Loader2 } from 'lucide-react'

interface UpgradeBannerProps {
  planTier?: string | null
}

export function UpgradeBanner({ planTier }: UpgradeBannerProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  // Only show for trial, pilot, or null (unpaid) agents
  if (planTier && !['trial', 'pilot', null].includes(planTier)) {
    return null
  }

  if (!isVisible) {
    return null
  }

  async function handleUpgrade() {
    setCheckoutLoading(true)
    setCheckoutError(null)
    try {
      const res = await fetch('/api/stripe/upgrade-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'pro' }),
      })
      if (!res.ok) {
        const data = await res.json()
        setCheckoutError(data.error || 'Something went wrong. Please try again.')
        setCheckoutLoading(false)
        return
      }
      const { url } = await res.json()
      window.location.href = url
      // Keep loading while browser navigates
    } catch {
      setCheckoutError('Network error. Please try again.')
      setCheckoutLoading(false)
    }
  }

  return (
    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg p-5 mb-6 shadow-md">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Zap className="w-6 h-6 text-white flex-shrink-0" />
          <div>
            <h3 className="font-bold text-white text-lg">Ready to go pro?</h3>
            <p className="text-emerald-50 text-sm">
              Upgrade to unlock unlimited SMS, advanced AI, and more features.
            </p>
            {checkoutError && (
              <p className="text-xs text-emerald-100 mt-1">{checkoutError}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleUpgrade}
            disabled={checkoutLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-emerald-600 font-semibold rounded-lg hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {checkoutLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
            ) : (
              <>View Plans <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="px-3 py-2 text-white hover:bg-white/20 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
