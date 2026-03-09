'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react'
import SetupFUB from './steps/fub'
import SetupTwilio from './steps/twilio'
import SetupSMSVerify from './steps/sms-verify'
import SetupComplete from './steps/complete'

export type SetupStep = 'fub' | 'twilio' | 'sms-verify' | 'complete'

export interface SetupState {
  fubConnected: boolean
  fubApiKey: string
  twilioConnected: boolean
  twilioPhone: string
  smsVerified: boolean
  agentPhone: string
  agentName: string
  agentId: string
  currentStep: SetupStep
}

const STEPS: { id: SetupStep; label: string; description: string }[] = [
  { id: 'fub', label: 'Connect FUB', description: 'Follow Up Boss CRM integration' },
  { id: 'twilio', label: 'Configure SMS', description: 'Set up your Twilio phone number' },
  { id: 'sms-verify', label: 'Verify SMS', description: 'Send a test message' },
]

function getStepIndex(step: SetupStep): number {
  const idx = STEPS.findIndex((s) => s.id === step)
  return idx === -1 ? STEPS.length : idx
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('leadflow_token') || sessionStorage.getItem('leadflow_token')
}

function getUser(): { id: string; firstName: string; lastName: string } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw =
      localStorage.getItem('leadflow_user') || sessionStorage.getItem('leadflow_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export default function SetupPage() {
  const router = useRouter()
  const [state, setState] = useState<SetupState>({
    fubConnected: false,
    fubApiKey: '',
    twilioConnected: false,
    twilioPhone: '',
    smsVerified: false,
    agentPhone: '',
    agentName: '',
    agentId: '',
    currentStep: 'fub',
  })
  const [loading, setLoading] = useState(true)

  // Load user info and existing wizard state on mount
  useEffect(() => {
    const user = getUser()
    if (!user) {
      router.replace('/login')
      return
    }

    const token = getToken()

    const initState: Partial<SetupState> = {
      agentId: user.id,
      agentName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    }

    // Load persisted wizard state from API
    fetch('/api/setup/status', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.wizardState) {
          const ws = data.wizardState
          initState.fubConnected = ws.fub_connected ?? false
          initState.fubApiKey = ws.fub_api_key ?? ''
          initState.twilioConnected = ws.twilio_connected ?? false
          initState.twilioPhone = ws.twilio_phone ?? ''
          initState.smsVerified = ws.sms_verified ?? false

          // Resume from last incomplete step
          if (!ws.fub_connected) {
            initState.currentStep = 'fub'
          } else if (!ws.twilio_connected) {
            initState.currentStep = 'twilio'
          } else if (!ws.sms_verified) {
            initState.currentStep = 'sms-verify'
          } else {
            initState.currentStep = 'complete'
          }
        }
      })
      .catch(() => {
        // Start from beginning on error
      })
      .finally(() => {
        setState((prev) => ({ ...prev, ...initState }))
        setLoading(false)
      })
  }, [router])

  const goToStep = (step: SetupStep) => {
    setState((prev) => ({ ...prev, currentStep: step }))
    // Persist step
    saveWizardState({ currentStep: step })
  }

  const saveWizardState = async (patch: Partial<SetupState>) => {
    const token = getToken()
    try {
      await fetch('/api/setup/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(patch),
      })
    } catch {
      // non-fatal
    }
  }

  const handleFUBComplete = (apiKey: string) => {
    const next: Partial<SetupState> = { fubConnected: true, fubApiKey: apiKey, currentStep: 'twilio' }
    setState((prev) => ({ ...prev, ...next }))
    saveWizardState(next)
  }

  const handleTwilioComplete = (phone: string) => {
    const next: Partial<SetupState> = { twilioConnected: true, twilioPhone: phone, currentStep: 'sms-verify' }
    setState((prev) => ({ ...prev, ...next }))
    saveWizardState(next)
  }

  const handleSMSVerified = (agentPhone: string) => {
    const next: Partial<SetupState> = { smsVerified: true, agentPhone, currentStep: 'complete' }
    setState((prev) => ({ ...prev, ...next }))
    saveWizardState(next)
    // Mark onboarding as done
    const token = getToken()
    fetch('/api/setup/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }).catch(() => {})
  }

  const handleSkip = (step: SetupStep) => {
    const steps: SetupStep[] = ['fub', 'twilio', 'sms-verify', 'complete']
    const nextIdx = steps.indexOf(step) + 1
    const nextStep = steps[nextIdx] ?? 'complete'
    setState((prev) => ({ ...prev, currentStep: nextStep }))
    saveWizardState({ currentStep: nextStep })
  }

  const handleFinish = () => {
    router.push('/dashboard')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const currentStepIndex = getStepIndex(state.currentStep)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/50">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
                <span className="text-emerald-400 font-bold text-sm">▶</span>
              </div>
              <h1 className="text-lg font-semibold text-white">LeadFlow AI</h1>
            </div>
            {state.currentStep !== 'complete' && (
              <button
                onClick={handleFinish}
                className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                Skip for now →
              </button>
            )}
          </div>
        </header>

        {/* Step indicators */}
        {state.currentStep !== 'complete' && (
          <div className="border-b border-slate-700/50 bg-slate-900/30">
            <div className="max-w-3xl mx-auto px-4 py-4">
              <div className="flex items-center gap-2">
                {STEPS.map((step, idx) => {
                  const done = idx < currentStepIndex
                  const active = idx === currentStepIndex
                  return (
                    <div key={step.id} className="flex items-center gap-2 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                            done
                              ? 'bg-emerald-500 text-white'
                              : active
                              ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400'
                              : 'bg-slate-700 text-slate-500'
                          }`}
                        >
                          {done ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <span className="text-xs font-bold">{idx + 1}</span>
                          )}
                        </div>
                        <div className="hidden sm:block min-w-0">
                          <div
                            className={`text-sm font-medium truncate ${
                              active ? 'text-white' : done ? 'text-emerald-400' : 'text-slate-500'
                            }`}
                          >
                            {step.label}
                          </div>
                        </div>
                      </div>
                      {idx < STEPS.length - 1 && (
                        <div
                          className={`flex-1 h-px mx-2 ${
                            idx < currentStepIndex ? 'bg-emerald-500' : 'bg-slate-700'
                          }`}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step content */}
        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-2xl">
            {state.currentStep === 'fub' && (
              <SetupFUB
                agentId={state.agentId}
                onComplete={handleFUBComplete}
                onSkip={() => handleSkip('fub')}
              />
            )}
            {state.currentStep === 'twilio' && (
              <SetupTwilio
                agentId={state.agentId}
                onComplete={handleTwilioComplete}
                onSkip={() => handleSkip('twilio')}
                onBack={() => goToStep('fub')}
              />
            )}
            {state.currentStep === 'sms-verify' && (
              <SetupSMSVerify
                agentId={state.agentId}
                agentName={state.agentName}
                twilioPhone={state.twilioPhone}
                onComplete={handleSMSVerified}
                onSkip={() => handleSkip('sms-verify')}
                onBack={() => goToStep('twilio')}
              />
            )}
            {state.currentStep === 'complete' && (
              <SetupComplete
                fubConnected={state.fubConnected}
                twilioConnected={state.twilioConnected}
                smsVerified={state.smsVerified}
                onFinish={handleFinish}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
