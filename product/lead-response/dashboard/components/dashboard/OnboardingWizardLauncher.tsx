'use client'

import { useEffect, useState } from 'react'
import { Rocket, ChevronRight, CheckCircle2, Circle } from 'lucide-react'

interface OnboardingStatus {
  onboardingCompleted: boolean
  onboardingStep: string | null
  showWizard: boolean
}

const ONBOARDING_STEPS = [
  { id: 'welcome', label: 'Welcome', description: 'Get started with LeadFlow' },
  { id: 'fub', label: 'Connect FUB', description: 'Link your Follow Up Boss account' },
  { id: 'sms', label: 'Configure SMS', label: 'Set up Twilio for messaging' },
  { id: 'simulator', label: 'See AI in Action', description: 'Watch the AI respond to a lead' },
  { id: 'complete', label: 'All Set!', description: 'You\'re ready to convert leads' }
]

export function OnboardingWizardLauncher() {
  const [status, setStatus] = useState<OnboardingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    async function fetchOnboardingStatus() {
      try {
        const response = await fetch('/api/auth/trial-status')
        if (response.ok) {
          const data = await response.json()
          setStatus({
            onboardingCompleted: data.onboardingCompleted,
            onboardingStep: data.onboardingStep,
            showWizard: !data.onboardingCompleted
          })
          
          // Check if user has collapsed this banner
          const collapsedKey = 'onboarding-launcher-collapsed'
          const isCollapsed = localStorage.getItem(collapsedKey) === 'true'
          setCollapsed(isCollapsed)
        }
      } catch (err) {
        console.error('Failed to fetch onboarding status:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchOnboardingStatus()
  }, [])

  const handleStartWizard = () => {
    // Log event
    fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'wizard_started',
        properties: { from: 'dashboard_banner' }
      })
    }).catch(() => {})
    
    // Redirect to onboarding wizard
    window.location.href = '/onboarding'
  }

  const handleCollapse = () => {
    setCollapsed(true)
    localStorage.setItem('onboarding-launcher-collapsed', 'true')
  }

  const handleExpand = () => {
    setCollapsed(false)
    localStorage.removeItem('onboarding-launcher-collapsed')
  }

  if (loading || !status || status.onboardingCompleted) {
    return null
  }

  // Get current step index
  const currentStepIndex = ONBOARDING_STEPS.findIndex(s => s.id === (status.onboardingStep || 'welcome'))
  const progress = Math.max(0, Math.min(100, (currentStepIndex / (ONBOARDING_STEPS.length - 1)) * 100))

  if (collapsed) {
    return (
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg p-3 mb-6 cursor-pointer hover:from-emerald-600 hover:to-teal-700 transition-colors" onClick={handleExpand}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Rocket className="w-5 h-5 text-white" />
            <span className="text-white font-medium">Continue Setup</span>
          </div>
          <ChevronRight className="w-5 h-5 text-white" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg p-6 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Rocket className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-lg">Complete Your Setup</h3>
            <p className="text-emerald-100 text-sm">
              Finish these steps to activate your AI lead response
            </p>
          </div>
        </div>
        <button
          onClick={handleCollapse}
          className="text-emerald-200 hover:text-white transition-colors text-sm"
        >
          Hide
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
          <div 
            className="h-full bg-white rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-emerald-100 text-xs mt-1">
          {Math.round(progress)}% complete
        </p>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        {ONBOARDING_STEPS.map((step, index) => {
          const isCompleted = index < currentStepIndex
          const isCurrent = index === currentStepIndex
          
          return (
            <div 
              key={step.id}
              className={`p-3 rounded-lg ${
                isCompleted 
                  ? 'bg-white/20' 
                  : isCurrent 
                    ? 'bg-white/30 ring-2 ring-white/50' 
                    : 'bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-white" />
                ) : (
                  <Circle className={`w-4 h-4 ${isCurrent ? 'text-white' : 'text-emerald-200'}`} />
                )}
                <span className={`text-xs font-medium ${isCurrent ? 'text-white' : 'text-emerald-100'}`}>
                  Step {index + 1}
                </span>
              </div>
              <p className={`text-sm font-medium ${isCurrent ? 'text-white' : 'text-emerald-100'}`}>
                {step.label}
              </p>
            </div>
          )
        })}
      </div>

      {/* CTA */}
      <button
        onClick={handleStartWizard}
        className="w-full py-3 bg-white text-emerald-600 font-semibold rounded-lg hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
      >
        Continue Setup
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  )
}
