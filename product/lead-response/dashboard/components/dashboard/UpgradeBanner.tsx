'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, Zap } from 'lucide-react'
import Link from 'next/link'

interface UpgradeBannerProps {
  planTier?: string | null
}

export function UpgradeBanner({ planTier }: UpgradeBannerProps) {
  const [isVisible, setIsVisible] = useState(true)

  // Only show for trial, pilot, or null (unpaid) agents
  if (planTier && !['trial', 'pilot', null].includes(planTier)) {
    return null
  }

  if (!isVisible) {
    return null
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
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href="/settings/billing"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-emerald-600 font-semibold rounded-lg hover:bg-emerald-50 transition-colors whitespace-nowrap"
          >
            View Plans <ArrowRight className="w-4 h-4" />
          </Link>
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
