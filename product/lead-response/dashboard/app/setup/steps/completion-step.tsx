'use client'

import { CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface CompletionStepProps {
  fubConnected: boolean
  phoneConfigured: boolean
  phoneNumber?: string
  smsVerified: boolean
  onComplete: () => void
}

export default function CompletionStep({
  fubConnected,
  phoneConfigured,
  phoneNumber,
  smsVerified,
  onComplete,
}: CompletionStepProps) {
  const router = useRouter()
  const allComplete = fubConnected && phoneConfigured && smsVerified
  const anySkipped = !fubConnected || !phoneConfigured || !smsVerified

  const statusItems = [
    {
      label: 'Follow Up Boss',
      ok: fubConnected,
      detail: fubConnected ? 'Connected — leads will sync automatically' : 'Not connected — go to Settings → Integrations',
    },
    {
      label: 'Phone Number',
      ok: phoneConfigured,
      detail: phoneConfigured && phoneNumber
        ? `Active: ${phoneNumber}`
        : phoneConfigured
        ? 'Configured'
        : 'Not configured — go to Settings → Integrations',
    },
    {
      label: 'SMS Verified',
      ok: smsVerified,
      detail: smsVerified ? 'Test SMS delivered successfully' : 'Not verified — go to Settings → Integrations',
    },
  ]

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-8 md:p-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 ${
            allComplete
              ? 'bg-emerald-500/20 border-2 border-emerald-500'
              : 'bg-amber-500/20 border-2 border-amber-500'
          }`}>
            {allComplete ? (
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            ) : (
              <span className="text-3xl">🎉</span>
            )}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {allComplete ? 'You\'re all set!' : 'Setup Complete!'}
          </h2>
          <p className="text-slate-400 text-sm">
            {allComplete
              ? 'LeadFlow is fully configured. You\'re ready to auto-respond to leads.'
              : 'You\'ve completed the wizard. Some steps were skipped — you can finish them anytime.'}
          </p>
        </div>

        {/* Status summary */}
        <div className="space-y-3 mb-8">
          {statusItems.map((item) => (
            <div
              key={item.label}
              className={`flex items-start gap-3 p-4 rounded-xl ${
                item.ok
                  ? 'bg-emerald-500/10 border border-emerald-500/20'
                  : 'bg-amber-500/10 border border-amber-500/20'
              }`}
            >
              {item.ok ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div>
                <p className={`font-semibold text-sm ${item.ok ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {item.label}
                </p>
                <p className={`text-xs mt-0.5 ${item.ok ? 'text-emerald-300/60' : 'text-amber-300/70'}`}>
                  {item.detail}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Reminder for skipped steps */}
        {anySkipped && (
          <div className="bg-slate-700/20 rounded-lg p-4 mb-6">
            <p className="text-slate-400 text-xs text-center">
              You can complete skipped steps anytime in{' '}
              <span className="text-emerald-400 font-medium">Settings → Integrations</span>
            </p>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={onComplete}
          className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
        >
          Go to Dashboard
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
