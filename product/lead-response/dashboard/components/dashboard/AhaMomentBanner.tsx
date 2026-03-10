'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Play, X, Bot, Zap } from 'lucide-react'

interface AhaMomentBannerProps {
  agentId: string
}

export function AhaMomentBanner({ agentId }: AhaMomentBannerProps) {
  const router = useRouter()
  const [showBanner, setShowBanner] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Check if agent has aha_pending flag or incomplete simulation
    const checkAhaStatus = async () => {
      try {
        // For now, check localStorage for dismissed state
        // In production, this would check the agent's aha_pending flag from Supabase
        const dismissed = localStorage.getItem('aha_banner_dismissed')
        if (dismissed === 'true') {
          setIsLoading(false)
          return
        }

        // Simulate checking agent status
        // In production: const { data } = await supabase.from('real_estate_agents').select('aha_pending').eq('id', agentId).single()
        const hasPendingAha = true // Placeholder - would come from DB
        
        setShowBanner(hasPendingAha)
      } catch (error) {
        console.error('Error checking Aha status:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkAhaStatus()
  }, [agentId])

  const handleDismiss = () => {
    setIsDismissed(true)
    localStorage.setItem('aha_banner_dismissed', 'true')
  }

  const handleRunSimulation = () => {
    // Navigate to onboarding simulator
    router.push('/onboarding?step=simulator&resume=true')
  }

  if (isLoading || isDismissed || !showBanner) {
    return null
  }

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 p-6 text-white shadow-lg">
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
              Complete your first simulation
            </h3>
            <p className="text-emerald-100 text-sm max-w-lg">
              See how LeadFlow AI responds to leads in under 30 seconds. Experience the 
              "aha moment" that makes our users fall in love with instant lead response.
            </p>
            <div className="flex items-center gap-4 mt-3 text-xs text-emerald-200">
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
            className="px-4 py-2 bg-white text-emerald-600 font-medium rounded-lg hover:bg-emerald-50 transition-colors flex items-center gap-2 shadow-sm"
          >
            <Play className="w-4 h-4" />
            Run Simulation
          </button>
          <button
            onClick={handleDismiss}
            className="p-2 text-emerald-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
