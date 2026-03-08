'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import WizardProgress from './components/wizard-progress'
import FubStep from './steps/fub-step'
import PhoneStep from './steps/phone-step'
import SmsVerifyStep from './steps/sms-verify-step'
import CompletionStep from './steps/completion-step'

type WizardStepKey = 'fub' | 'phone' | 'sms' | 'complete'

interface OnboardingState {
  onboardingCompleted: boolean
  currentStep: number
  fubConnected: boolean
  phoneConfigured: boolean
  smsVerified: boolean
}

const STEPS = [
  { key: 'fub', label: 'Connect FUB' },
  { key: 'phone', label: 'Add Phone' },
  { key: 'sms', label: 'Verify SMS' },
]

function getToken(): string {
  if (typeof window === 'undefined') return ''
  return (
    localStorage.getItem('leadflow_token') ||
    sessionStorage.getItem('leadflow_token') ||
    ''
  )
}

function getAgentName(): string {
  if (typeof window === 'undefined') return ''
  try {
    const raw =
      localStorage.getItem('leadflow_user') ||
      sessionStorage.getItem('leadflow_user') ||
      '{}'
    const user = JSON.parse(raw)
    return user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : ''
  } catch {
    return ''
  }
}

export default function SetupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState<WizardStepKey>('fub')
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())
  const [state, setState] = useState<OnboardingState>({
    onboardingCompleted: false,
    currentStep: 0,
    fubConnected: false,
    phoneConfigured: false,
    smsVerified: false,
  })
  const [phoneNumber, setPhoneNumber] = useState('')

  const token = getToken()
  const agentName = getAgentName()

  const loadStatus = useCallback(async () => {
    if (!token) {
      router.push('/login')
      return
    }

    try {
      const res = await fetch('/api/agents/onboarding/status', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.status === 401) {
        router.push('/login')
        return
      }

      if (!res.ok) {
        // If status endpoint fails, continue with defaults
        setLoading(false)
        return
      }

      const data: OnboardingState = await res.json()
      setState(data)

      // If already completed, go to dashboard
      if (data.onboardingCompleted) {
        router.push('/dashboard')
        return
      }

      // Resume from last step
      const completed = new Set<string>()
      if (data.fubConnected) completed.add('fub')
      if (data.phoneConfigured) completed.add('phone')
      if (data.smsVerified) completed.add('sms')
      setCompletedSteps(completed)

      // Advance to appropriate step
      if (data.currentStep >= 3) setCurrentStep('sms')
      else if (data.currentStep >= 2) setCurrentStep('sms')
      else if (data.currentStep >= 1) setCurrentStep('phone')
      else setCurrentStep('fub')
    } catch {
      // Continue with defaults on network error
    } finally {
      setLoading(false)
    }
  }, [token, router])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  const markComplete = (step: string) => {
    setCompletedSteps((prev) => new Set([...prev, step]))
  }

  const handleFubComplete = (skipped = false) => {
    if (!skipped) markComplete('fub')
    setState((s) => ({ ...s, fubConnected: !skipped }))
    setCurrentStep('phone')
  }

  const handlePhoneComplete = (number: string, skipped = false) => {
    if (!skipped) {
      markComplete('phone')
      setPhoneNumber(number)
    }
    setState((s) => ({ ...s, phoneConfigured: !skipped }))
    setCurrentStep('sms')
  }

  const handleSmsComplete = async (skipped = false) => {
    if (!skipped) markComplete('sms')
    setState((s) => ({ ...s, smsVerified: !skipped }))
    setCurrentStep('complete')
  }

  const handleFinish = async () => {
    // Mark wizard complete in DB
    try {
      await fetch('/api/agents/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
    } catch {
      // Non-fatal — proceed to dashboard
    }
    router.push('/dashboard')
  }

  const stepIndex = currentStep === 'complete' ? 3 : STEPS.findIndex((s) => s.key === currentStep)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/8 rounded-full blur-3xl" />
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
            {currentStep !== 'complete' && (
              <div className="text-sm text-slate-400">
                Step {stepIndex + 1} of {STEPS.length}
              </div>
            )}
          </div>
        </header>

        {/* Progress bar (hide on completion screen) */}
        {currentStep !== 'complete' && (
          <WizardProgress
            steps={STEPS}
            currentStepIndex={stepIndex}
            completedSteps={completedSteps}
          />
        )}

        {/* Content */}
        <main className="flex-1 flex items-start justify-center px-4 py-8">
          <div className="w-full max-w-xl">
            {currentStep === 'fub' && (
              <FubStep
                onComplete={handleFubComplete}
                token={token}
                alreadyConnected={state.fubConnected}
              />
            )}

            {currentStep === 'phone' && (
              <PhoneStep
                onComplete={handlePhoneComplete}
                token={token}
                alreadyConfigured={state.phoneConfigured}
              />
            )}

            {currentStep === 'sms' && (
              <SmsVerifyStep
                onComplete={handleSmsComplete}
                token={token}
                agentName={agentName}
                phoneConfigured={state.phoneConfigured}
                alreadyVerified={state.smsVerified}
              />
            )}

            {currentStep === 'complete' && (
              <CompletionStep
                fubConnected={state.fubConnected || completedSteps.has('fub')}
                phoneConfigured={state.phoneConfigured || completedSteps.has('phone')}
                phoneNumber={phoneNumber}
                smsVerified={state.smsVerified || completedSteps.has('sms')}
                onComplete={handleFinish}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
