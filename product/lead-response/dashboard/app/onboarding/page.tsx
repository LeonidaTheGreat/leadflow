'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useRef, Suspense } from 'react'
import OnboardingWelcome from './steps/welcome'
import OnboardingAgentInfo from './steps/agent-info'
import OnboardingCalendar from './steps/calendar'
import OnboardingSMS from './steps/sms-config'
import OnboardingSimulator from './steps/simulator'
import OnboardingConfirm from './steps/confirmation'

// Step tracking IDs (DB event log): 'welcome', 'agent-info', 'calendar', 'sms', 'confirmation', 'simulator'
type OnboardingStep = 'welcome' | 'agent-info' | 'calendar' | 'sms' | 'simulator' | 'confirmation'

const steps = ['welcome', 'agent-info', 'calendar', 'sms', 'simulator', 'confirmation'] as const

const STEP_LABELS: Record<OnboardingStep, string> = {
  welcome: 'Account',
  'agent-info': 'Profile',
  calendar: 'Calendar',
  sms: 'SMS',
  simulator: 'Demo',
  confirmation: 'Confirm',
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentData {
  email: string
  password: string
  firstName: string
  lastName: string
  phoneNumber: string
  state: string
  calcomLink: string
  smsPhoneNumber: string
  ahaCompleted: boolean
  ahaResponseTimeMs: number | null
  ahaSkipped: boolean
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmContent: string | null
  utmTerm: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readUtmParams(searchParams: ReturnType<typeof useSearchParams>) {
  const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const
  let stored: Record<string, string> = {}
  try {
    const raw = sessionStorage.getItem('leadflow_utm')
    if (raw) stored = JSON.parse(raw)
  } catch { /* SSR safety */ }
  const fromUrl: Record<string, string> = {}
  UTM_KEYS.forEach((key) => { const v = searchParams.get(key); if (v) fromUrl[key] = v })
  const merged = { ...stored, ...fromUrl }
  return {
    utmSource: merged['utm_source'] ?? null,
    utmMedium: merged['utm_medium'] ?? null,
    utmCampaign: merged['utm_campaign'] ?? null,
    utmContent: merged['utm_content'] ?? null,
    utmTerm: merged['utm_term'] ?? null,
  }
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({
  currentIndex,
  completedSteps,
}: {
  currentIndex: number
  completedSteps: Set<number>
}) {
  return (
    <div className="flex items-center justify-center gap-2 py-4 px-4">
      {steps.map((stepId, i) => {
        const isCompleted = completedSteps.has(i)
        const isActive = i === currentIndex
        return (
          <div key={stepId} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                aria-current={isActive ? 'step' : undefined}
                data-testid={isActive ? 'current-step' : undefined}
                className={[
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all',
                  isCompleted
                    ? 'bg-emerald-500 text-white'
                    : isActive
                    ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500 ring-2 ring-emerald-500/40'
                    : 'bg-slate-700 text-slate-400 border border-slate-600',
                ].join(' ')}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  String(i + 1)
                )}
              </button>
              <span
                className={[
                  'text-xs font-medium hidden sm:block',
                  isActive ? 'text-emerald-400' : isCompleted ? 'text-emerald-500/70' : 'text-slate-500',
                ].join(' ')}
              >
                {STEP_LABELS[stepId]}
              </span>
              {isActive && (
                <span className="text-xs font-medium text-emerald-400 sm:hidden">{STEP_LABELS[stepId]}</span>
              )}
            </div>
            {i < steps.length - 1 && (
              <div
                className={[
                  'w-8 sm:w-16 h-px mx-1 sm:mx-2',
                  completedSteps.has(i) ? 'bg-emerald-500' : 'bg-slate-700',
                ].join(' ')}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ currentIndex, total }: { currentIndex: number; total: number }) {
  const pct = Math.round(((currentIndex + 1) / total) * 100)
  return (
    <div className="px-4 pb-4">
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Onboarding progress"
        className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden"
      >
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-slate-400 mt-1 text-right">
        Step {currentIndex + 1} of {total}
      </p>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function OnboardingPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const autoSaveTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastSavedRef = useRef<string>('')

  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome')
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [agentData, setAgentData] = useState<AgentData>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    state: '',
    calcomLink: '',
    smsPhoneNumber: '',
    ahaCompleted: false,
    ahaResponseTimeMs: null,
    ahaSkipped: false,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmContent: null,
    utmTerm: null,
  })

  const currentStepIndex = steps.indexOf(currentStep)

  // Read UTM params on mount
  useEffect(() => {
    const utm = readUtmParams(searchParams)
    if (Object.values(utm).some(Boolean)) {
      setAgentData((prev) => ({ ...prev, ...utm }))
    }
  }, [searchParams])

  // Auto-save every 2 seconds
  useEffect(() => {
    autoSaveTimer.current = setInterval(async () => {
      const serialized = JSON.stringify({ email: agentData.email, firstName: agentData.firstName, state: agentData.state })
      if (serialized === lastSavedRef.current) return
      lastSavedRef.current = serialized
      try {
        await fetch('/api/onboarding/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: agentData.email,
            firstName: agentData.firstName,
            lastName: agentData.lastName,
            state: agentData.state,
            step: currentStepIndex,
          }),
        })
      } catch { /* silently ignore auto-save failures */ }
    }, 2000)
    return () => {
      if (autoSaveTimer.current) clearInterval(autoSaveTimer.current)
    }
  }, [agentData, currentStepIndex])

  const goNext = () => {
    const idx = steps.indexOf(currentStep)
    setCompletedSteps((prev) => new Set([...prev, idx]))
    if (idx < steps.length - 1) {
      setCurrentStep(steps[idx + 1] as OnboardingStep)
    }
  }

  const goBack = () => {
    const idx = steps.indexOf(currentStep)
    if (idx > 0) {
      setCurrentStep(steps[idx - 1] as OnboardingStep)
    }
  }

  const completeOnboarding = async () => {
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const data = {
        ...agentData,
        aha_moment_completed: agentData.ahaCompleted,
        aha_response_time_ms: agentData.ahaResponseTimeMs,
      }
      const res = await fetch('/api/agents/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.status === 409) {
        setSubmitError('An account with this email already exists. Please sign in instead.')
        return
      }
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || `Server error (${res.status})`)
      }
      setCompletedSteps((prev) => new Set([...prev, currentStepIndex]))
      router.push('/dashboard')
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to create account. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

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
              Step {currentStepIndex + 1} of {steps.length}
            </div>
          </div>
        </header>

        {/* Step Indicator */}
        <div className="border-b border-slate-700/50 bg-slate-900/30">
          <div className="max-w-2xl mx-auto">
            <StepIndicator currentIndex={currentStepIndex} completedSteps={completedSteps} />
            <ProgressBar currentIndex={currentStepIndex} total={steps.length} />
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 flex items-start justify-center px-4 py-8">
          <div className="w-full max-w-2xl">
            {currentStep === 'welcome' && (
              <OnboardingWelcome
                onNext={goNext}
                agentData={agentData}
                setAgentData={setAgentData as (data: any) => void}
              />
            )}
            {currentStep === 'agent-info' && (
              <OnboardingAgentInfo
                onNext={goNext}
                onBack={goBack}
                agentData={agentData}
                setAgentData={setAgentData as (data: any) => void}
              />
            )}
            {currentStep === 'calendar' && (
              <OnboardingCalendar
                onNext={goNext}
                onBack={goBack}
                agentData={agentData}
                setAgentData={setAgentData as (data: any) => void}
              />
            )}
            {currentStep === 'sms' && (
              <OnboardingSMS
                onNext={goNext}
                onBack={goBack}
                agentData={agentData}
                setAgentData={setAgentData as (data: any) => void}
              />
            )}
            {currentStep === 'simulator' && (
              <OnboardingSimulator
                onNext={goNext}
                onBack={goBack}
                agentData={agentData}
                setAgentData={setAgentData as (data: any) => void}
              />
            )}
            {currentStep === 'confirmation' && (
              <OnboardingConfirm
                onNext={completeOnboarding}
                onBack={goBack}
                agentData={{ ...agentData, submitError, isSubmitting }}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingPageInner />
    </Suspense>
  )
}
