'use client'

import { CheckCircle2, AlertCircle, Rocket, ArrowRight } from 'lucide-react'

interface SetupCompleteProps {
  onComplete: () => Promise<void>
  onBack: () => void
  setupData: {
    fubConnected: boolean
    twilioConnected: boolean
    smsVerified: boolean
    smsConnected?: boolean
    simulatorCompleted: boolean
  }
  isLoading: boolean
}

export default function SetupComplete({
  onComplete,
  onBack,
  setupData,
  isLoading
}: SetupCompleteProps) {
  // Support both old smsConnected and new twilioConnected fields
  const twilioConnected = setupData.twilioConnected ?? setupData.smsConnected ?? false
  const smsVerified = setupData.smsVerified ?? false

  const items = [
    { label: 'FUB — Follow Up Boss', completed: setupData.fubConnected, key: 'fub' },
    { label: 'Twilio — SMS number', completed: twilioConnected, key: 'twilio' },
    { label: 'SMS Verified', completed: smsVerified, key: 'sms' },
    { label: 'AI simulator tested', completed: setupData.simulatorCompleted, key: 'simulator' },
  ]

  return (
    <div className="animate-in fade-in-up duration-500">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-8 md:p-12">
        <div className="mb-8">
          <div className="w-16 h-16 rounded-xl bg-green-500/20 border border-green-500/50 flex items-center justify-center mx-auto mb-6">
            <Rocket className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-3xl font-bold text-white text-center mb-2">Setup Complete!</h2>
          <p className="text-slate-300 text-center">
            Your AI lead response system is ready to go
          </p>
        </div>

        {/* Completion Summary */}
        <div className="space-y-3 mb-8">
          {items.map((item) => (
            <div key={item.key} className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/30">
              {item.completed ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 text-green-400" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 text-slate-500" />
              )}
              <span className={item.completed ? 'text-white' : 'text-slate-400'}>
                {item.label}
              </span>
              {!item.completed && (
                <span className="ml-auto text-xs text-slate-500 italic">
                  Skipped — Not connected
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Settings reminder for skipped steps */}
        {(!setupData.fubConnected || !twilioConnected || !smsVerified) && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-6">
            <p className="text-amber-300 text-sm">
              You can complete skipped setup steps anytime in{' '}
              <span className="font-medium text-amber-200">Settings → Integrations</span>.
            </p>
          </div>
        )}

        {/* What's Next */}
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-lg p-6 mb-8">
          <h3 className="text-green-300 font-semibold mb-3">What happens next:</h3>
          <ol className="space-y-2 text-sm text-green-200/80">
            <li className="flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500/20 text-green-300 text-xs font-bold flex-shrink-0 mt-0.5">1</span>
              <span>Your dashboard will show real leads when they come in</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500/20 text-green-300 text-xs font-bold flex-shrink-0 mt-0.5">2</span>
              <span>AI will analyze and respond within 30 seconds</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500/20 text-green-300 text-xs font-bold flex-shrink-0 mt-0.5">3</span>
              <span>You'll see detailed analytics and lead conversations</span>
            </li>
          </ol>
        </div>

        {/* CTA */}
        <div className="flex gap-3">
          <button
            onClick={onBack}
            data-testid="setup-complete-back"
            className="flex-1 px-4 py-3 border border-slate-600/50 text-slate-300 font-semibold rounded-lg hover:bg-slate-700/30 transition-all duration-200"
          >
            ← Back
          </button>
          <button
            onClick={onComplete}
            disabled={isLoading}
            data-testid="setup-complete-go-to-dashboard"
            className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Setting up...
              </>
            ) : (
              <>
                Go to Dashboard
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>

        {/* Footer Note */}
        <p className="text-center text-slate-400 text-xs mt-6">
          Tip: You can complete any skipped steps anytime in Settings → Integrations.
        </p>
      </div>
    </div>
  )
}
