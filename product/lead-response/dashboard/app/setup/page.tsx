'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import SetupFUB from './steps/fub'
import SetupSMS from './steps/sms'
import SetupSimulator from './steps/simulator'
import SetupComplete from './steps/complete'
import SetupProgress from './components/progress'

type SetupStep = 'fub' | 'sms' | 'simulator' | 'complete'

function SetupPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentStep, setCurrentStep] = useState<SetupStep>('fub')
  const [setupData, setSetupData] = useState({
    fubConnected: false,
    fubApiKey: '',
    smsConnected: false,
    smsPhoneNumber: '',
    simulatorCompleted: false,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [agentId, setAgentId] = useState<string | null>(null)

  // Fetch current agent status on mount
  useEffect(() => {
    async function fetchAgentStatus() {
      try {
        const response = await fetch('/api/auth/trial-status')
        if (response.ok) {
          const data = await response.json()
          setAgentId(data.agentId)
          
          // If onboarding is already completed, redirect to dashboard
          if (data.onboardingCompleted) {
            router.push('/dashboard')
            return
          }
          
          // Resume from saved step if available
          if (data.onboardingStep) {
            const savedStep = data.onboardingStep as SetupStep
            if (['fub', 'sms', 'simulator', 'complete'].includes(savedStep)) {
              setCurrentStep(savedStep)
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch agent status:', err)
      }
    }

    fetchAgentStatus()
  }, [router])

  const steps: SetupStep[] = ['fub', 'sms', 'simulator', 'complete']
  const currentStepIndex = steps.indexOf(currentStep)

  const goToStep = (step: SetupStep) => {
    setCurrentStep(step)
    // Save progress to server
    saveProgress(step)
  }

  const nextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      const nextStepName = steps[currentStepIndex + 1]
      setCurrentStep(nextStepName)
      saveProgress(nextStepName)
    }
  }

  const prevStep = () => {
    if (currentStepIndex > 0) {
      const prevStepName = steps[currentStepIndex - 1]
      setCurrentStep(prevStepName)
      saveProgress(prevStepName)
    }
  }

  const saveProgress = async (step: SetupStep) => {
    try {
      await fetch('/api/setup/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step })
      })
    } catch (err) {
      console.error('Failed to save progress:', err)
    }
  }

  const completeSetup = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/setup/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fubConnected: setupData.fubConnected,
          smsConnected: setupData.smsConnected,
          simulatorCompleted: setupData.simulatorCompleted
        })
      })

      if (!response.ok) {
        throw new Error('Failed to complete setup')
      }

      // Log onboarding_completed event
      await fetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'onboarding_completed',
          properties: {
            fubConnected: setupData.fubConnected,
            smsConnected: setupData.smsConnected,
            simulatorCompleted: setupData.simulatorCompleted
          }
        })
      }).catch(() => {})

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error) {
      console.error('Setup completion error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const skipSetup = () => {
    // Allow users to skip and go to dashboard
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/50">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
                <span className="text-emerald-400 font-bold text-sm">▶</span>
              </div>
              <h1 className="text-lg font-semibold text-white">LeadFlow AI</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-slate-400">
                Step {currentStepIndex + 1} of {steps.length}
              </div>
              <button
                onClick={skipSetup}
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                Skip for now
              </button>
            </div>
          </div>
        </header>

        {/* Progress */}
        <SetupProgress currentStep={currentStepIndex} totalSteps={steps.length} />

        {/* Content */}
        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-2xl">
            {currentStep === 'fub' && (
              <SetupFUB
                onNext={nextStep}
                setupData={setupData}
                setSetupData={setSetupData}
              />
            )}

            {currentStep === 'sms' && (
              <SetupSMS
                onNext={nextStep}
                onBack={prevStep}
                setupData={setupData}
                setSetupData={setSetupData}
              />
            )}

            {currentStep === 'simulator' && (
              <SetupSimulator
                onNext={nextStep}
                onBack={prevStep}
                setupData={setupData}
                setSetupData={setSetupData}
                agentId={agentId}
              />
            )}

            {currentStep === 'complete' && (
              <SetupComplete
                onComplete={completeSetup}
                onBack={prevStep}
                setupData={setupData}
                isLoading={isLoading}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function SetupPage() {
  return (
    <Suspense fallback={null}>
      <SetupPageInner />
    </Suspense>
  )
}
