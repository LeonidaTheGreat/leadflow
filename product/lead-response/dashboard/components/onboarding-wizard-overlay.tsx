'use client'

/**
 * OnboardingWizardOverlay
 *
 * A modal overlay that displays the onboarding wizard directly on the dashboard.
 * This implements AC-3 from the PRD: "Setup Wizard overlay appears automatically
 * when onboarding_completed=false".
 *
 * The wizard renders as a full-screen overlay on top of the dashboard,
 * allowing the agent to complete setup without leaving the dashboard context.
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, X } from 'lucide-react'
import SetupFUB from '@/app/setup/steps/fub'
import SetupTwilio from '@/app/setup/steps/twilio'
import SetupSMSVerify from '@/app/setup/steps/sms-verify'
import SetupSimulator from '@/app/setup/steps/simulator'
import SetupComplete from '@/app/setup/steps/complete'

export type SetupStep = 'fub' | 'twilio' | 'sms-verify' | 'simulator' | 'complete'

export interface SetupState {
  fubConnected: boolean
  fubApiKey: string
  twilioConnected: boolean
  twilioPhone: string
  smsVerified: boolean
  agentPhone: string
  agentName: string
  agentId: string
  simulatorCompleted: boolean
  simulatorResponseTimeMs: number | null
  simulatorSkipped: boolean
  currentStep: SetupStep
}

const STEPS: { id: SetupStep; label: string; description: string }[] = [
  { id: 'fub', label: 'Connect FUB', description: 'Follow Up Boss CRM integration' },
  { id: 'twilio', label: 'Configure SMS', description: 'Set up your Twilio phone number' },
  { id: 'sms-verify', label: 'Verify SMS', description: 'Send a test message' },
  { id: 'simulator', label: 'See the Magic', description: 'Watch the AI in action' },
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

interface OnboardingWizardOverlayProps {
  onComplete: () => void
  onDismiss?: () => void
}

export function OnboardingWizardOverlay({ onComplete, onDismiss }: OnboardingWizardOverlayProps) {
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
    simulatorCompleted: false,
    simulatorResponseTimeMs: null,
    simulatorSkipped: false,
    currentStep: 'fub',
  })
  const [loading, setLoading] = useState(true)
  const [isVisible, setIsVisible] = useState(false)

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
          initState.simulatorCompleted = ws.simulator_completed ?? false
          initState.simulatorSkipped = ws.simulator_skipped ?? false

          // Resume from last incomplete step
          if (!ws.fub_connected) {
            initState.currentStep = 'fub'
          } else if (!ws.twilio_connected) {
            initState.currentStep = 'twilio'
          } else if (!ws.sms_verified) {
            initState.currentStep = 'sms-verify'
          } else if (!ws.simulator_completed && !ws.simulator_skipped) {
            initState.currentStep = 'simulator'
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
        // Small delay for smooth animation
        setTimeout(() => setIsVisible(true), 50)
      })
  }, [router])

  const saveWizardState = useCallback(async (patch: Partial<SetupState>) => {
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
  }, [])

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
    const next: Partial<SetupState> = { smsVerified: true, agentPhone, currentStep: 'simulator' }
    setState((prev) => ({ ...prev, ...next }))
    saveWizardState(next)
  }

  const handleSimulatorComplete = (responseTimeMs: number | null) => {
    const next: Partial<SetupState> = {
      simulatorCompleted: true,
      simulatorResponseTimeMs: responseTimeMs,
      currentStep: 'complete',
    }
    setState((prev) => ({ ...prev, ...next }))
    saveWizardState(next)
    // Mark full onboarding as done
    const token = getToken()
    fetch('/api/setup/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }).catch(() => {})
  }

  const handleSimulatorSkip = () => {
    const next: Partial<SetupState> = {
      simulatorSkipped: true,
      currentStep: 'complete',
    }
    setState((prev) => ({ ...prev, ...next }))
    saveWizardState(next)
    // Mark onboarding as done even if simulator was skipped
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
    const steps: SetupStep[] = ['fub', 'twilio', 'sms-verify', 'simulator', 'complete']
    const nextIdx = steps.indexOf(step) + 1
    const nextStep = steps[nextIdx] ?? 'complete'
    setState((prev) => ({ ...prev, currentStep: nextStep }))
    saveWizardState({ currentStep: nextStep })
  }

  const handleFinish = () => {
    setIsVisible(false)
    setTimeout(() => {
      onComplete()
    }, 300)
  }

  const handleDismiss = () => {
    if (onDismiss) {
      setIsVisible(false)
      setTimeout(() => {
        onDismiss()
      }, 300)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const currentStepIndex = getStepIndex(state.currentStep)

  return (
    <div
      className={`fixed inset-0 z-50 overflow-y-auto transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm" />

      {/* Content */}
      <div className="relative min-h-screen flex flex-col">
        {/* Header */}
        <header className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/50 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
                <span className="text-emerald-400 font-bold text-sm">▶</span>
              </div>
              <h1 className="text-lg font-semibold text-white">LeadFlow AI</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-slate-400">
                Step {currentStepIndex + 1} of {STEPS.length}
              </div>
              {onDismiss && state.currentStep !== 'complete' && (
                <button
                  onClick={handleDismiss}
                  className="p-2 text-slate-400 hover:text-slate-200 transition-colors rounded-lg hover:bg-slate-800"
                  aria-label="Close wizard"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
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
                onNext={() => {
                  if (state.fubApiKey) handleFUBComplete(state.fubApiKey)
                }}
                setupData={{
                  fubConnected: state.fubConnected,
                  fubApiKey: state.fubApiKey,
                }}
                setSetupData={(data) => setState((prev) => ({ ...prev, ...data }))}
              />
            )}
            {state.currentStep === 'twilio' && (
              <SetupTwilio
                agentId={state.agentId}
                onComplete={handleTwilioComplete}
                onSkip={() => handleSkip('twilio')}
                onBack={() => setState((prev) => ({ ...prev, currentStep: 'fub' }))}
              />
            )}
            {state.currentStep === 'sms-verify' && (
              <SetupSMSVerify
                agentId={state.agentId}
                agentName={state.agentName}
                twilioPhone={state.twilioPhone}
                onComplete={handleSMSVerified}
                onSkip={() => handleSkip('sms-verify')}
                onBack={() => setState((prev) => ({ ...prev, currentStep: 'twilio' }))}
              />
            )}
            {state.currentStep === 'simulator' && (
              <SetupSimulator
                agentId={state.agentId}
                onComplete={handleSimulatorComplete}
                onSkip={handleSimulatorSkip}
                onBack={() => setState((prev) => ({ ...prev, currentStep: 'sms-verify' }))}
              />
            )}
            {state.currentStep === 'complete' && (
              <SetupComplete
                onComplete={async () => handleFinish()}
                onBack={() => setState((prev) => ({ ...prev, currentStep: 'simulator' }))}
                setupData={{
                  fubConnected: state.fubConnected,
                  smsConnected: state.twilioConnected,
                  simulatorCompleted: state.simulatorCompleted,
                }}
                isLoading={false}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
