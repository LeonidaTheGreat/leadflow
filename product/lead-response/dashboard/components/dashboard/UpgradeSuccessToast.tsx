'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, X } from 'lucide-react'

/**
 * Shows a success toast when the agent returns from Stripe checkout
 * via `/dashboard?upgrade=success`. Clears the query param after 5 seconds.
 */
export function UpgradeSuccessToast() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (searchParams.get('upgrade') === 'success') {
      setVisible(true)

      const timer = setTimeout(() => {
        dismiss()
      }, 5000)

      return () => clearTimeout(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  function dismiss() {
    setVisible(false)
    // Remove the query param without a full page reload
    const url = new URL(window.location.href)
    url.searchParams.delete('upgrade')
    router.replace(url.pathname + (url.search || ''), { scroll: false })
  }

  if (!visible) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-4 right-4 z-50 flex items-start gap-3 bg-emerald-600 text-white rounded-lg shadow-lg px-4 py-3 max-w-sm"
    >
      <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <p className="text-sm font-medium flex-1">
        You&apos;re now on Pro! Your AI lead response is fully active.
      </p>
      <button
        onClick={dismiss}
        className="ml-2 text-white hover:text-emerald-200 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
