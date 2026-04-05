'use client'

import { useEffect, useState } from 'react'
import { Sparkles, X, Play } from 'lucide-react'

interface SimulatorBannerProps {
  agentId: string
}

export function SimulatorBanner({ agentId }: SimulatorBannerProps) {
  const [showBanner, setShowBanner] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function checkSimulatorStatus() {
      try {
        // Check localStorage for dismissal (24h cooldown)
        const dismissedKey = `simulator-banner-dismissed-${agentId}`
        const dismissedAt = localStorage.getItem(dismissedKey)
        
        if (dismissedAt) {
          const dismissedTime = new Date(dismissedAt).getTime()
          const now = Date.now()
          const hoursSinceDismissed = (now - dismissedTime) / (1000 * 60 * 60)
          
          if (hoursSinceDismissed < 24) {
            setIsDismissed(true)
            setIsLoading(false)
            return
          }
        }

        // Check if simulator is completed
        const response = await fetch(`/api/onboarding/simulator/status?agentId=${agentId}`)
        if (response.ok) {
          const data = await response.json()
          if (!data.hasCompleted) {
            setShowBanner(true)
          }
        }
      } catch (err) {
        console.error('Failed to check simulator status:', err)
      } finally {
        setIsLoading(false)
      }
    }

    checkSimulatorStatus()
  }, [agentId])

  const handleDismiss = () => {
    setShowBanner(false)
    setIsDismissed(true)
    
    // Store dismissal time
    const dismissedKey = `simulator-banner-dismissed-${agentId}`
    localStorage.setItem(dismissedKey, new Date().toISOString())
    
    // Log dismissal event
    fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'simulator_banner_dismissed',
        properties: { agentId }
      })
    }).catch(() => {})
  }

  const handleWatchDemo = () => {
    // Log click event
    fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'simulator_banner_clicked',
        properties: { agentId }
      })
    }).catch(() => {})
    
    // Navigate to simulator
    window.location.href = '/setup/simulator'
  }

  if (isLoading || !showBanner || isDismissed) {
    return null
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-800/50 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-amber-900 dark:text-amber-100">
                🤖 You haven't seen your AI in action yet
              </h3>
              <p className="text-amber-700 dark:text-amber-300 text-sm mt-1">
                Watch a 30-second demo to see how your AI responds to leads — no setup required.
              </p>
            </div>
            
            <button
              onClick={handleDismiss}
              className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 transition-colors shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="mt-3">
            <button
              onClick={handleWatchDemo}
              data-testid="simulator-banner-cta"
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Play className="w-4 h-4" />
              Watch the Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
