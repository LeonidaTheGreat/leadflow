'use client'

export function SetupProgress({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="border-b border-slate-700/50 bg-slate-900/30 backdrop-blur-sm">
      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Progress bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 h-1 bg-slate-700/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>
          <span className="text-xs text-slate-400 whitespace-nowrap ml-2">
            {Math.round(((currentStep + 1) / totalSteps) * 100)}%
          </span>
        </div>
      </div>
    </div>
  )
}

export default SetupProgress
