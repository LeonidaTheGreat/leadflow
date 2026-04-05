'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Play, X, Bot, Zap, Loader2 } from 'lucide-react'

export function AhaMomentBanner() {
  const router = useRouter()
  const [showBanner, setShowBanner] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isDismissed, setIsDismissed] = useState(false)
  const [dismissedUntil, setDismissedUntil] = useState<string | null>(null)

  useEffect(() => {
    // Check if banner was dismissed recently (24h)
    const checkDismissal = () => {
      try {
        const dismissedData = localStorage.getItem('aha_banner_dismissed')
        if (dismissedData) {
          const { timestamp } = JSON.parse(dismissedData)
          const dismissedAt = new Date(timestamp)
          const now = new Date()
          const hoursSinceDismissal = (now.getTime() - dismissedAt.getTime()) / (1000 * 60 * 60)
          
          // If dismissed less than 24 hours ago, don't show
          if (hoursSinceDismissal < 24) {
            setDismissedUntil(new Date(dismissedAt.getTime() + 24 * 60 * 60 * 1000).toISOString())
            setIsLoading(false)
            return true
          }
        }
      } catch {
        // Ignore localStorage errors
      }
      return false
    }

    const checkAhaStatus = async () => {
      // First check local dismissal
      if (checkDismissal()) {
        return
      }

      try {
        // Check if agent has completed the simulator
        const response = await fetch('/api/onboarding/simulator-status')
        if (!response.ok) {
          setIsLoading(false)
          return
        }

        const data = await response.json()
        
        // Show banner if no successful simulation exists
        setShowBanner(!data.hasCompletedSimulation)
      } catch (error) {
        console.error('Error checking Aha status:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkAhaStatus()
  }, [dismissedUntil])

  const handleDismiss = () => {
    setIsDismissed(true)
    try {
      localStorage.setItem('aha_banner_dismissed', JSON.stringify({
        timestamp: new Date().toISOString()
      }))
    } catch {
      // Ignore localStorage errors
    }
  }

  const handleRunSimulation = () => {
    // Navigate to standalone simulator
    router.push('/simulator?returnTo=/dashboard')
  }

  if (isLoading || isDismissed || !showBanner) {
    return null
  }

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-500 via-amber-500 to-orange-500 p-6 text-white shadow-lg mb-6">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">
              🤖 You haven&apos;t seen your AI in action yet
            </h3>
            <p className="text-amber-100 text-sm max-w-lg">
              See how LeadFlow AI responds to leads in under 30 seconds. Experience the 
              &quot;aha moment&quot; that makes our users fall in love with instant lead response.
            </p>
            <div className="flex items-center gap-4 mt-3 text-xs text-amber-200">
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                &lt;30s response time
              </span>
              <span className="flex items-center gap-1">
                <Bot className="w-3.5 h-3.5" />
                AI-powered
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRunSimulation}
            className="px-4 py-2 bg-white text-amber-600 font-medium rounded-lg hover:bg-amber-50 transition-colors flex items-center gap-2 shadow-sm"
          >
            <Play className="w-4 h-4" />
            Watch the demo →
          </button>
          <button
            onClick={handleDismiss}
            className="p-2 text-amber-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
