'use client'

import { useState, useCallback } from 'react'
import { CreditCard, Loader2, ExternalLink, AlertCircle } from 'lucide-react'
import { useAnalytics, PostHogEvents } from '@/lib/analytics'

interface StripePortalButtonProps {
  agentId: string
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  className?: string
  returnUrl?: string
  onSuccess?: () => void
  onError?: (error: Error) => void
}

interface PortalSessionResponse {
  success: boolean
  url?: string
  sessionId?: string
  error?: string
  code?: string
}

export function StripePortalButton({
  agentId,
  variant = 'primary',
  size = 'md',
  showIcon = true,
  className = '',
  returnUrl,
  onSuccess,
  onError,
}: StripePortalButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { track } = useAnalytics()

  const handleOpenPortal = useCallback(async () => {
    if (!agentId) {
      const err = new Error('Agent ID is required')
      setError(err.message)
      onError?.(err)
      return
    }

    setIsLoading(true)
    setError(null)

    // Track portal open attempt
    track(PostHogEvents.BILLING_PORTAL_OPENED, {
      agent_id: agentId,
    })

    try {
      const response = await fetch('/api/stripe/portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId,
          returnUrl,
        }),
      })

      const data: PortalSessionResponse = await response.json()

      if (!response.ok || !data.success) {
        const errorMessage = data.error || 'Failed to open billing portal'
        throw new Error(errorMessage)
      }

      if (!data.url) {
        throw new Error('No portal URL returned')
      }

      // Track successful portal session creation
      track(PostHogEvents.BILLING_PORTAL_SESSION_CREATED, {
        agent_id: agentId,
        session_id: data.sessionId,
      })

      // Call success callback
      onSuccess?.()

      // Open the portal in the same tab
      window.location.href = data.url

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      
      // Track error
      track(PostHogEvents.ERROR_OCCURRED, {
        error_type: 'billing_portal_error',
        error_message: errorMessage,
        agent_id: agentId,
      })

      onError?.(err instanceof Error ? err : new Error(errorMessage))
    } finally {
      setIsLoading(false)
    }
  }, [agentId, returnUrl, onSuccess, onError, track])

  // Variant styles
  const variantStyles = {
    primary: 'bg-emerald-500 hover:bg-emerald-600 text-white',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white',
    outline: 'border border-slate-300 hover:bg-slate-50 text-slate-700 dark:border-slate-600 dark:hover:bg-slate-800 dark:text-slate-300',
    ghost: 'hover:bg-slate-100 text-slate-700 dark:hover:bg-slate-800 dark:text-slate-300',
  }

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  return (
    <div className={className}>
      <button
        onClick={handleOpenPortal}
        disabled={isLoading || !agentId}
        className={`
          inline-flex items-center justify-center gap-2
          font-medium rounded-lg transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${sizeStyles[size]}
        `}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading...</span>
          </>
        ) : (
          <>
            {showIcon && <CreditCard className="w-4 h-4" />}
            <span>Manage Subscription</span>
            {showIcon && <ExternalLink className="w-3 h-3 opacity-60" />}
          </>
        )}
      </button>

      {error && (
        <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
    </div>
  )
}

// Hook for checking portal availability
export function useStripePortal(agentId: string) {
  const [isAvailable, setIsAvailable] = useState(false)
  const [billingInfo, setBillingInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const checkAvailability = useCallback(async () => {
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
        throw new Error(data.error || 'Failed to check portal availability')
      }

      setIsAvailable(data.portalAvailable)
      setBillingInfo(data.billingInfo)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check portal availability'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [agentId])

  // Check availability on mount
  useState(() => {
    checkAvailability()
  })

  return {
    isAvailable,
    billingInfo,
    isLoading,
    error,
    refetch: checkAvailability,
  }
}
