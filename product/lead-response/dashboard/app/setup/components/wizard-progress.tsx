'use client'

import { CheckCircle2 } from 'lucide-react'

interface WizardStep {
  label: string
  key: string
}

interface WizardProgressProps {
  steps: WizardStep[]
  currentStepIndex: number
  completedSteps: Set<string>
}

export default function WizardProgress({ steps, currentStepIndex, completedSteps }: WizardProgressProps) {
  return (
    <div className="w-full px-4 py-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          {steps.map((step, idx) => {
            const isCompleted = completedSteps.has(step.key)
            const isCurrent = idx === currentStepIndex
            const isPast = idx < currentStepIndex

            return (
              <div key={step.key} className="flex items-center flex-1">
                {/* Step indicator */}
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 ${
                      isCompleted || isPast
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                        : isCurrent
                        ? 'bg-slate-700 border-2 border-emerald-500 text-emerald-400'
                        : 'bg-slate-800 border border-slate-600 text-slate-500'
                    }`}
                  >
                    {isCompleted || isPast ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium whitespace-nowrap transition-colors duration-300 ${
                      isCurrent ? 'text-emerald-400' : isCompleted || isPast ? 'text-emerald-300' : 'text-slate-500'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>

                {/* Connector line (not after last step) */}
                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 mb-5 transition-colors duration-300 ${
                      isPast || isCompleted ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
