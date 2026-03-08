'use client'

interface WizardStep {
  label: string
  description: string
}

const STEPS: WizardStep[] = [
  { label: 'Connect FUB', description: 'Link your CRM' },
  { label: 'Add Phone', description: 'Configure SMS' },
  { label: 'Verify SMS', description: 'Send test message' },
]

interface WizardProgressProps {
  currentStep: number // 0-indexed
  completedSteps: boolean[] // [fubDone, phoneDone, smsDone]
}

export default function WizardProgress({ currentStep, completedSteps }: WizardProgressProps) {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between relative">
        {/* Connector line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-700/50" />
        <div
          className="absolute top-5 left-0 h-0.5 bg-emerald-500 transition-all duration-500"
          style={{
            width:
              currentStep === 0
                ? '0%'
                : currentStep === 1
                ? '50%'
                : '100%',
          }}
        />

        {STEPS.map((step, i) => {
          const isComplete = completedSteps[i]
          const isCurrent = currentStep === i
          const isPast = currentStep > i

          return (
            <div key={step.label} className="relative flex flex-col items-center z-10">
              {/* Circle */}
              <div
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                  isComplete || isPast
                    ? 'bg-emerald-500 border-emerald-500'
                    : isCurrent
                    ? 'bg-slate-800 border-emerald-500'
                    : 'bg-slate-800 border-slate-600'
                }`}
              >
                {isComplete || isPast ? (
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span
                    className={`text-sm font-bold ${
                      isCurrent ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    {i + 1}
                  </span>
                )}
              </div>

              {/* Label */}
              <div className="mt-2 text-center">
                <p
                  className={`text-xs font-semibold ${
                    isCurrent ? 'text-white' : isComplete || isPast ? 'text-emerald-400' : 'text-slate-500'
                  }`}
                >
                  {step.label}
                </p>
                <p className="text-xs text-slate-500 hidden sm:block">{step.description}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
