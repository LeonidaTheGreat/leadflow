'use client'

import { CheckCircle2, Circle, ArrowRight, Settings } from 'lucide-react'
import Link from 'next/link'

interface Props {
  fubConnected: boolean
  twilioConnected: boolean
  smsVerified: boolean
  onFinish: () => void
}

export default function SetupComplete({ fubConnected, twilioConnected, smsVerified, onFinish }: Props) {
  const completedCount = [fubConnected, twilioConnected, smsVerified].filter(Boolean).length
  const allDone = completedCount === 3

  const steps = [
    {
      label: 'Follow Up Boss',
      description: 'CRM integration',
      done: fubConnected,
      icon: '🏠',
    },
    {
      label: 'Twilio SMS',
      description: 'Phone number configured',
      done: twilioConnected,
      icon: '📱',
    },
    {
      label: 'SMS Verified',
      description: 'Test message delivered',
      done: smsVerified,
      icon: '✉️',
    },
  ]

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-8 md:p-10 text-center">
        {/* Trophy / Partial icon */}
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">{allDone ? '🎉' : '✅'}</span>
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">
          {allDone ? "You're all set!" : "You're ready to go!"}
        </h2>
        <p className="text-slate-400 text-sm mb-8 max-w-md mx-auto">
          {allDone
            ? 'Your LeadFlow AI is fully configured. New leads will be responded to in under 30 seconds.'
            : `${completedCount} of 3 integrations connected. You can finish the remaining setup in Settings → Integrations.`}
        </p>

        {/* Step summary */}
        <div className="grid gap-3 mb-8 text-left">
          {steps.map((step) => (
            <div
              key={step.label}
              className={`flex items-center gap-3 rounded-lg p-3 border ${
                step.done
                  ? 'bg-emerald-500/10 border-emerald-500/20'
                  : 'bg-slate-700/30 border-slate-700'
              }`}
            >
              <span className="text-xl shrink-0">{step.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white">{step.label}</div>
                <div className="text-xs text-slate-400">{step.description}</div>
              </div>
              {step.done ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <div className="text-xs text-slate-500 shrink-0">Skipped</div>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onFinish}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            Go to Dashboard <ArrowRight className="w-4 h-4" />
          </button>

          {!allDone && (
            <Link
              href="/integrations"
              className="w-full text-center text-sm text-slate-400 hover:text-slate-200 py-2 flex items-center justify-center gap-1 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Complete setup in Settings → Integrations
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
