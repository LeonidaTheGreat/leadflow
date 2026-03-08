'use client'

/**
 * Post-Login Onboarding Wizard
 * Shown to new agents after their first login if onboarding_completed = false.
 * Three steps: (1) Connect FUB → (2) Configure Phone → (3) Verify SMS
 *
 * Progress is persisted to Supabase at each step so agents can resume.
 */

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import WizardProgress from './components/wizard-progress'
import StepFUB from './steps/step-fub'
import StepPhone from './steps/step-phone'
import StepVerifySMS from './steps/step-verify-sms'

type WizardStep = 0 | 1 | 2 // 0=FUB, 1=Phone, 2=SMS

interface OnboardingState {
  step: WizardStep
  fubDone: boolean
  phoneDone: boolean
  smsDone: boolean
  phoneNumber: string
  agentName: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [state, setState] = useState<OnboardingState>({
    step: 0,
    fubDone: false,
    phoneDone: false,
    smsDone: false,
    phoneNumber: '',
    agentName: '',
  })

  // On mount: verify auth, load current onboarding state from API for resume
  useEffect(() => {
    const storedToken =
      localStorage.getItem('leadflow_token') ||
      sessionStorage.getItem('leadflow_token')

    if (!storedToken) {
      router.push('/login')
      return
    }

    setToken(storedToken)

    // Fetch current onboarding state to support resuming
    fetch('/api/agents/onboarding/status', {
      headers: { Authorization: `Bearer ${storedToken}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          // Token invalid or expired
          router.push('/login')
          return
        }

        // If already completed, go straight to dashboard
        if (data.onboardingCompleted) {
          router.push('/dashboard')
          return
        }

        // Resume at the right step
        const resumeStep: WizardStep =
          data.onboardingStep >= 2
            ? 2
            : data.onboardingStep >= 1
            ? 1
            : 0

        setState({
          step: resumeStep,
          fubDone: data.fubConnected ?? false,
          phoneDone: data.phoneConfigured ?? false,
          smsDone: data.smsVerified ?? false,
          phoneNumber: data.twilioPhoneNumber ?? '',
          agentName: data.agentName ?? '',
        })
      })
      .catch(() => {
        // Non-fatal — just start from step 0
      })
      .finally(() => setIsLoading(false))
  }, [router])

  const goToStep = (step: WizardStep) =>
    setState((s) => ({ ...s, step }))

  // ---- Step completion handlers ----
  const handleFUBComplete = () => {
    setState((s) => ({ ...s, fubDone: true, step: 1 }))
  }

  const handleFUBSkip = () => {
    setState((s) => ({ ...s, step: 1 }))
  }

  const handlePhoneComplete = (phoneNumber: string) => {
    setState((s) => ({ ...s, phoneDone: true, phoneNumber, step: 2 }))
  }

  const handlePhoneSkip = () => {
    setState((s) => ({ ...s, step: 2 }))
  }

  const handleSMSComplete = () => {
    setState((s) => ({ ...s, smsDone: true }))
    finishWizard({ ...state, smsDone: true })
  }

  const handleSMSSkip = () => {
    finishWizard(state)
  }

  const finishWizard = (finalState: OnboardingState) => {
    // Store summary for the completion screen
    sessionStorage.setItem(
      'onboarding_status',
      JSON.stringify({
        fubConnected: finalState.fubDone,
        phoneConfigured: finalState.phoneDone,
        smsVerified: finalState.smsDone,
        phoneNumber: finalState.phoneNumber || null,
      })
    )
    router.push('/onboarding/complete')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading your setup…</p>
        </div>
      </div>
    )
  }

  if (!token) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
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
            <div className="text-sm text-slate-400">
              Step {state.step + 1} of 3
            </div>
          </div>
        </header>

        {/* Progress bar */}
        <div className="max-w-2xl mx-auto w-full">
          <WizardProgress
            currentStep={state.step}
            completedSteps={[state.fubDone, state.phoneDone, state.smsDone]}
          />
        </div>

        {/* Step content */}
        <main className="flex-1 flex items-start justify-center px-4 py-6 pb-16">
          <div className="w-full max-w-2xl">
            {/* Welcome banner (only on first step) */}
            {state.step === 0 && (
              <div className="mb-6 text-center">
                <h2 className="text-3xl font-bold text-white mb-2">
                  Welcome to LeadFlow! 🎉
                </h2>
                <p className="text-slate-400 text-sm md:text-base max-w-md mx-auto">
                  Let's get you set up in under 5 minutes. Complete these steps to start
                  auto-responding to leads in real time.
                </p>
              </div>
            )}

            {state.step === 0 && (
              <StepFUB
                onComplete={handleFUBComplete}
                onSkip={handleFUBSkip}
                token={token}
              />
            )}

            {state.step === 1 && (
              <StepPhone
                onComplete={handlePhoneComplete}
                onSkip={handlePhoneSkip}
                token={token}
              />
            )}

            {state.step === 2 && (
              <StepVerifySMS
                onComplete={handleSMSComplete}
                onSkip={handleSMSSkip}
                token={token}
                agentName={state.agentName}
                phoneDisabled={!state.phoneDone}
              />
            )}

            {/* Back navigation */}
            {state.step > 0 && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => goToStep((state.step - 1) as WizardStep)}
                  className="text-sm text-slate-500 hover:text-slate-300 transition"
                >
                  ← Go back
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
