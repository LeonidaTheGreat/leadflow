'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, AlertTriangle, ArrowRight, Settings } from 'lucide-react'

interface OnboardingStatus {
  fubConnected: boolean
  phoneConfigured: boolean
  smsVerified: boolean
  phoneNumber: string | null
}

export default function OnboardingCompletePage() {
  const router = useRouter()
  const [status, setStatus] = useState<OnboardingStatus | null>(null)
  const [isCompleting, setIsCompleting] = useState(false)

  useEffect(() => {
    // Read status from sessionStorage (set by the wizard)
    const stored = sessionStorage.getItem('onboarding_status')
    if (stored) {
      try {
        setStatus(JSON.parse(stored))
      } catch {
        router.push('/onboarding')
        return
      }
    }

    // Mark onboarding complete
    const token =
      localStorage.getItem('leadflow_token') ||
      sessionStorage.getItem('leadflow_token')

    if (!token) {
      router.push('/login')
      return
    }

    setIsCompleting(true)
    fetch('/api/agents/onboarding/complete', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.status) {
          setStatus(data.status)
        }
      })
      .catch(console.error)
      .finally(() => setIsCompleting(false))
  }, [router])

  const handleGoToDashboard = () => {
    // Clear onboarding flag from storage
    sessionStorage.removeItem('onboarding_status')
    router.push('/dashboard')
  }

  const StatusItem = ({
    label,
    value,
    connected,
  }: {
    label: string
    value?: string
    connected: boolean
  }) => (
    <div className="flex items-center justify-between p-4 bg-slate-700/20 rounded-lg">
      <div className="flex items-center gap-3">
        {connected ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
        )}
        <div>
          <p className="text-sm font-medium text-white">{label}</p>
          {value && <p className="text-xs text-slate-400 font-mono">{value}</p>}
        </div>
      </div>
      <span
        className={`text-xs font-semibold px-2 py-1 rounded-full ${
          connected
            ? 'bg-emerald-500/20 text-emerald-400'
            : 'bg-amber-500/20 text-amber-400'
        }`}
      >
        {connected ? 'Connected' : 'Not configured'}
      </span>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-8 md:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {isCompleting ? 'Finishing up…' : "You're all set! 🎉"}
            </h1>
            <p className="text-slate-400 text-sm">
              LeadFlow is ready to respond to your leads in under 30 seconds.
            </p>
          </div>

          {/* Status summary */}
          {status && (
            <div className="space-y-3 mb-8">
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Setup Summary</p>
              <StatusItem
                label="Follow Up Boss"
                connected={status.fubConnected}
              />
              <StatusItem
                label="SMS Phone Number"
                value={status.phoneNumber ?? undefined}
                connected={status.phoneConfigured}
              />
              <StatusItem label="SMS Verified" connected={status.smsVerified} />
            </div>
          )}

          {/* Incomplete notice */}
          {status && (!status.fubConnected || !status.phoneConfigured) && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-300 text-sm font-medium">Some steps were skipped</p>
                <p className="text-amber-300/70 text-xs mt-1">
                  You can complete setup anytime in{' '}
                  <span className="font-medium">Settings → Integrations</span>.
                </p>
              </div>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={handleGoToDashboard}
            disabled={isCompleting}
            className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-lg disabled:opacity-60"
          >
            Go to Dashboard <ArrowRight className="w-5 h-5" />
          </button>

          <button
            onClick={() => router.push('/integrations')}
            className="w-full mt-3 py-2.5 px-4 border border-slate-600/50 text-slate-400 hover:text-slate-300 font-medium rounded-lg hover:bg-slate-700/30 transition-all duration-200 flex items-center justify-center gap-2 text-sm"
          >
            <Settings className="w-4 h-4" />
            Manage Integrations
          </button>
        </div>
      </div>
    </div>
  )
}
