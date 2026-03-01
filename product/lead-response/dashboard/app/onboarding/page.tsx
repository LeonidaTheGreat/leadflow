'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import OnboardingWelcome from './steps/welcome'
import OnboardingAgentInfo from './steps/agent-info'
import OnboardingCalendar from './steps/calendar'
import OnboardingSMS from './steps/sms-config'
import OnboardingConfirm from './steps/confirmation'
import OnboardingProgress from './components/progress'

type OnboardingStep = 'welcome' | 'agent-info' | 'calendar' | 'sms' | 'confirmation'

export default function OnboardingPage() {
  const router = useRouter()
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
  })
  const [isLoading, setIsLoading] = useState(false)

  const steps: OnboardingStep[] = ['welcome', 'agent-info', 'calendar', 'sms', 'confirmation']
  const currentStepIndex = steps.indexOf(currentStep)

  const goToStep = (step: OnboardingStep) => {
    setCurrentStep(step)
  }

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
      // Submit agent data to backend
      const response = await fetch('/api/agents/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentData),
      })

      if (!response.ok) {
        throw new Error('Failed to complete onboarding')
      }

      const result = await response.json()
      
      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error) {
      console.error('Onboarding error:', error)
      // Show error toast (implement with toast provider)
    } finally {
      setIsLoading(false)
    }
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
                onNext={() => {
                  nextStep()
                }}
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

            {currentStep === 'confirmation' && (
              <OnboardingConfirm
                onBack={prevStep}
                onComplete={completeOnboarding}
                agentData={agentData}
                isLoading={isLoading}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
