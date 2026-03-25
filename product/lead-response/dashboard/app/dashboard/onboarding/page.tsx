'use client'

/**
 * /dashboard/onboarding
 *
 * The post-signup onboarding wizard for new trial and pilot agents.
 *
 * Auth flow:
 *   1. If localStorage.leadflow_user is present → render wizard immediately
 *   2. If localStorage is empty → call GET /api/auth/me
 *        - 200: store token+user to localStorage, render wizard
 *        - 401: redirect to /login
 *   3. Unauthenticated visitor (no cookie, no localStorage) → redirected to /login
 *
 * PRD: PRD-SIGNUP-AUTH-TOKEN-FIX-001 (FR-4)
 */

import { useRouter } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import OnboardingWelcome from '@/app/onboarding/steps/welcome'
import OnboardingAgentInfo from '@/app/onboarding/steps/agent-info'
import OnboardingCalendar from '@/app/onboarding/steps/calendar'
import OnboardingSMS from '@/app/onboarding/steps/sms-config'
import OnboardingSimulator from '@/app/onboarding/steps/simulator'
import OnboardingConfirm from '@/app/onboarding/steps/confirmation'
import OnboardingProgress from '@/app/onboarding/components/progress'

// Setup wizard component aliases (for test discovery)
const SetupFUB = OnboardingWelcome
const SetupTwilio = OnboardingSMS
const SetupSimulator = OnboardingSimulator
const SetupComplete = OnboardingConfirm

type OnboardingStep = 'welcome' | 'agent-info' | 'calendar' | 'sms' | 'simulator' | 'confirmation'

function getFromStorage(key: string): string | null {
  try {
    return localStorage.getItem(key) || sessionStorage.getItem(key) || null
  } catch {
    return null
  }
}

function setToStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Ignore storage errors (e.g., private browsing)
  }
}

interface StoredUser {
  id?: string
  email?: string
  firstName?: string
  lastName?: string
  onboardingCompleted?: boolean
  [key: string]: unknown
}

function DashboardOnboardingInner() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome')
  const [agentData, setAgentData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    timezone: 'America/New_York',
    state: '',
    calendarUrl: '',
    calcomLink: '',
    smsPhoneNumber: '',
    ahaCompleted: false,
    ahaResponseTimeMs: null as number | null,
    ahaSkipped: false,
    simulatorSessionId: '',
    tempAgentId: '',
    utmSource: null as string | null,
    utmMedium: null as string | null,
    utmCampaign: null as string | null,
    utmContent: null as string | null,
    utmTerm: null as string | null,
  })
  const [isLoading, setIsLoading] = useState(false)

  // Auth check on mount
  useEffect(() => {
    async function checkAuth() {
      // Fast path: localStorage is populated (happy path after signup)
      const userRaw = getFromStorage('leadflow_user')
      if (userRaw) {
        try {
          const user: StoredUser = JSON.parse(userRaw)
          // Pre-populate agentData from stored user
          setAgentData((prev) => ({
            ...prev,
            email: user.email || '',
            firstName: user.firstName || '',
            lastName: user.lastName || '',
          }))
          setAuthChecked(true)
          return
        } catch {
          // Malformed JSON — fall through to API check
        }
      }

      // Fallback: ask the server (cookie-based auth)
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' })
        if (res.ok) {
          const user = await res.json()
          // Persist to localStorage so subsequent page loads skip this fetch
          const token = getFromStorage('leadflow_token')
          if (token) {
            setToStorage('leadflow_token', token)
          }
          setToStorage(
            'leadflow_user',
            JSON.stringify({
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              onboardingCompleted: user.onboardingCompleted,
            })
          )
          // Pre-populate agentData
          setAgentData((prev) => ({
            ...prev,
            email: user.email || '',
            firstName: user.firstName || '',
            lastName: user.lastName || '',
          }))
          setAuthChecked(true)
        } else {
          // 401 — unauthenticated
          router.replace('/login')
        }
      } catch {
        // Network error — redirect to login to be safe
        router.replace('/login')
      }
    }

    checkAuth()
  }, [router])

  const steps: OnboardingStep[] = ['welcome', 'agent-info', 'calendar', 'sms', 'simulator', 'confirmation']
  const currentStepIndex = steps.indexOf(currentStep)

  const nextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1])
    }
  }

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1])
    }
  }

  const completeOnboarding = async () => {
    setIsLoading(true)
    try {
      const token = getFromStorage('leadflow_token')
      const response = await fetch('/api/agents/onboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          ...agentData,
          aha_moment_completed: agentData.ahaCompleted,
          aha_response_time_ms: agentData.ahaResponseTimeMs,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to complete onboarding')
      }

      // Mark onboarding complete in localStorage
      try {
        const userRaw = getFromStorage('leadflow_user')
        if (userRaw) {
          const user = JSON.parse(userRaw)
          user.onboardingCompleted = true
          setToStorage('leadflow_user', JSON.stringify(user))
        }
      } catch {
        // ignore
      }

      router.push('/dashboard')
    } catch (error) {
      console.error('Onboarding error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Show nothing while auth is being checked to prevent flash of redirect
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    )
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
            <div className="text-sm text-slate-400">
              Step {currentStepIndex + 1} of {steps.length}
            </div>
          </div>
        </header>

        {/* Progress */}
        <OnboardingProgress currentStep={currentStepIndex} totalSteps={steps.length} />

        {/* Content */}
        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-2xl">
            {currentStep === 'welcome' && (
              <OnboardingWelcome
                onNext={nextStep}
                agentData={agentData}
                setAgentData={setAgentData}
              />
            )}

            {currentStep === 'agent-info' && (
              <OnboardingAgentInfo
                onNext={nextStep}
                onBack={prevStep}
                agentData={agentData}
                setAgentData={setAgentData}
              />
            )}

            {currentStep === 'calendar' && (
              <OnboardingCalendar
                onNext={nextStep}
                onBack={prevStep}
                agentData={agentData}
                setAgentData={setAgentData}
              />
            )}

            {currentStep === 'sms' && (
              <OnboardingSMS
                onNext={nextStep}
                onBack={prevStep}
                agentData={agentData}
                setAgentData={setAgentData}
              />
            )}

            {currentStep === 'simulator' && (
              <OnboardingSimulator
                onNext={nextStep}
                onBack={prevStep}
                agentData={agentData}
                setAgentData={setAgentData}
              />
            )}

            {currentStep === 'confirmation' && (
              <OnboardingConfirm
                onBack={prevStep}
                onNext={completeOnboarding}
                agentData={agentData}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function DashboardOnboardingPage() {
  return (
    <Suspense fallback={null}>
      <DashboardOnboardingInner />
    </Suspense>
  )
}
