export default function OnboardingProgress({
  currentStep,
  totalSteps,
}: {
  currentStep: number
  totalSteps: number
}) {
  const progress = ((currentStep + 1) / totalSteps) * 100

  return (
    <div className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/30">
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="w-full h-1 bg-slate-700/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Progress: {currentStep + 1} of {totalSteps}
        </p>
      </div>
    </div>
  )
}
