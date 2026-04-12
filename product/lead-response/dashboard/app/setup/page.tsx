'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import SetupFUB from './steps/fub'
import SetupTwilio from './steps/twilio'
import SetupSMSVerify from './steps/sms-verify'
import SetupSimulator from './steps/simulator'
import SetupComplete from './steps/complete'
import SetupProgress from './components/progress'

type SetupStep = 'fub' | 'twilio' | 'sms-verify' | 'simulator' | 'complete'

const STEPS: { id: SetupStep; label: string }[] = [
  { id: 'simulator', label: 'Test AI' },
  { id: 'fub', label: 'Connect FUB' },
  { id: 'twilio', label: 'Phone Number' },
  { id: 'sms-verify', label: 'Verify SMS' },
  { id: 'complete', label: 'Done' },
]

interface WizardState {
  fubConnected: boolean
  fubApiKey: string
  twilioConnected: boolean
  twilioPhone: string
  smsVerified: boolean
  simulatorCompleted: boolean
}

// ws is the raw DB row (snake_case keys), not the WizardState (camelCase)
function resumeStep(ws: Record<string, unknown>): SetupStep {
  if (!ws.simulator_completed) return 'simulator'
  if (!ws.fub_connected) return 'fub'
  if (!ws.twilio_connected) return 'twilio'
  if (!ws.sms_verified) return 'sms-verify'
  return 'complete'
}

function SetupPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentStep, setCurrentStep] = useState<SetupStep>('simulator')
  const [setupData, setSetupData] = useState<WizardState>({
    fubConnected: false,
    fubApiKey: '',
    twilioConnected: false,
    twilioPhone: '',
    smsVerified: false,
    simulatorCompleted: false,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [agentId, setAgentId] = useState<string | null>(null)
  const [agentName, setAgentName] = useState<string>('')

  // ─── Fetch agent status + wizard state on mount ─────���───────────────────────
  useEffect(() => {
    async function fetchAgentStatus() {
      try {
        // Load auth status
        const authRes = await fetch('/api/auth/trial-status')
        if (!authRes.ok) {
          // Not authenticated — redirect to login
          router.replace('/login')
          return
        }
        const authData = await authRes.json()

        if (!authData.agentId) {
          router.replace('/login')
          return
        }

        setAgentId(authData.agentId)
        if (authData.firstName) setAgentName(authData.firstName)

        // If onboarding already completed, redirect to dashboard
        if (authData.onboardingCompleted) {
          router.push('/dashboard')
          return
        }

        // Load saved wizard state from server
        const wizardRes = await fetch('/api/setup/status')
        if (wizardRes.ok) {
          const wizardData = await wizardRes.json()
          const ws = wizardData.wizardState

          if (ws) {
            // Restore setup data
            setSetupData((prev) => ({
              ...prev,
              fubConnected: ws.fub_connected ?? false,
              fubApiKey: ws.fub_api_key ?? '',
              twilioConnected: ws.twilio_connected ?? false,
              twilioPhone: ws.twilio_phone ?? '',
              smsVerified: ws.sms_verified ?? false,
              simulatorCompleted: ws.simulator_completed ?? false,
            }))

            // Determine resume step based on saved state
            const step = ws.current_step as SetupStep
            const validSteps: SetupStep[] = STEPS.map((s) => s.id)
            if (step && validSteps.includes(step)) {
              setCurrentStep(step)
            } else {
              // Derive from completion flags
              setCurrentStep(resumeStep(ws))
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch agent status:', err)
        // Fail open — let the wizard continue from the beginning
      }
    }

    fetchAgentStatus()
  }, [router])

  const steps = STEPS.map((s) => s.id)
  const currentStepIndex = steps.indexOf(currentStep)

  // ─── Persist wizard state ──────────────────────────────��─────────────────────

  const saveWizardState = async (patch: Partial<Record<string, unknown>>) => {
    try {
      await fetch('/api/setup/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
    } catch (err) {
      // Non-fatal — log and continue
      console.warn('Failed to save wizard state:', err)
    }
  }

  const goToStep = (step: SetupStep) => {
    setCurrentStep(step)
    saveWizardState({ currentStep: step })
  }

  const nextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      const next = steps[currentStepIndex + 1]
      goToStep(next)
    }
  }

  const prevStep = () => {
    if (currentStepIndex > 0) {
      const prev = steps[currentStepIndex - 1]
      setCurrentStep(prev)
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
          twilioConnected: setupData.twilioConnected,
          smsVerified: setupData.smsVerified,
          simulatorCompleted: setupData.simulatorCompleted,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to complete setup')
      }

      // Log onboarding_completed event (best effort)
      await fetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'onboarding_completed',
          properties: {
            fubConnected: setupData.fubConnected,
            twilioConnected: setupData.twilioConnected,
            smsVerified: setupData.smsVerified,
            simulatorCompleted: setupData.simulatorCompleted,
          },
        }),
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
                <span className="text-emerald-400 font-bold text-sm">&#9658;</span>
              </div>
              <h1 className="text-lg font-semibold text-white">LeadFlow AI</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-slate-400">
                Step {currentStepIndex + 1} of {steps.length}
              </div>
              <button
                onClick={skipSetup}
                data-testid="setup-skip-all"
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
                onNext={() => {
                  saveWizardState({ fubConnected: setupData.fubConnected, currentStep: 'twilio' })
                  nextStep()
                }}
                onSkip={() => {
                  saveWizardState({ fubConnected: false, currentStep: 'twilio' })
                  nextStep()
                }}
                setupData={setupData}
                setSetupData={(data) => {
                  setSetupData(data)
                  if (data.fubConnected) {
                    saveWizardState({ fubConnected: true, fubApiKey: data.fubApiKey })
                  }
                }}
              />
            )}

            {currentStep === 'twilio' && (
              <SetupTwilio
                agentId={agentId || ''}
                onComplete={(phone) => {
                  const updated = { ...setupData, twilioConnected: true, twilioPhone: phone }
                  setSetupData(updated)
                  saveWizardState({ twilioConnected: true, twilioPhone: phone, currentStep: 'sms-verify' })
                  nextStep()
                }}
                onSkip={() => {
                  saveWizardState({ twilioConnected: false, currentStep: 'sms-verify' })
                  nextStep()
                }}
                onBack={prevStep}
              />
            )}

            {currentStep === 'sms-verify' && (
              <SetupSMSVerify
                agentId={agentId || ''}
                agentName={agentName}
                twilioPhone={setupData.twilioPhone}
                onComplete={(phone) => {
                  const updated = { ...setupData, smsVerified: true }
                  setSetupData(updated)
                  saveWizardState({ smsVerified: true, currentStep: 'complete' })
                  nextStep()
                }}
                onSkip={() => {
                  saveWizardState({ smsVerified: false, currentStep: 'complete' })
                  nextStep()
                }}
                onBack={prevStep}
              />
            )}

            {currentStep === 'simulator' && (
              <SetupSimulator
                onNext={() => {
                  const updated = { ...setupData, simulatorCompleted: true }
                  setSetupData(updated)
                  saveWizardState({ simulatorCompleted: true, currentStep: 'fub' })
                  nextStep()
                }}
                onBack={prevStep}
                setupData={setupData}
                setSetupData={(data) => {
                  setSetupData(data)
                }}
                agentId={agentId}
              />
            )}

            {currentStep === 'complete' && (
              <SetupComplete
                onComplete={completeSetup}
                onBack={prevStep}
                setupData={{
                  fubConnected: setupData.fubConnected,
                  twilioConnected: setupData.twilioConnected,
                  smsVerified: setupData.smsVerified,
                  smsConnected: setupData.twilioConnected,
                  simulatorCompleted: setupData.simulatorCompleted,
                }}
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
