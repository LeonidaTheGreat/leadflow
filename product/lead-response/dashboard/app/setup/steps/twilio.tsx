'use client'

import { useState } from 'react'
import { Phone, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'

interface Props {
  agentId: string
  onComplete: (phone: string) => void
  onSkip: () => void
  onBack: () => void
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('leadflow_token') || sessionStorage.getItem('leadflow_token')
}

function formatPhoneDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 0) return ''
  if (digits.length <= 3) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
}

export default function SetupTwilio({ agentId, onComplete, onSkip, onBack }: Props) {
  const [phoneInput, setPhoneInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'system' | 'existing'>('system')

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 10)
    setPhoneInput(raw)
    setError('')
  }

  const handleSave = async () => {
    const digits = phoneInput.replace(/\D/g, '')
    if (mode === 'existing' && digits.length !== 10) {
      setError('Please enter a valid 10-digit US phone number.')
      return
    }

    setIsSaving(true)
    try {
      const token = getToken()
      const body: Record<string, string> = {}
      if (mode === 'existing' && digits) {
        body.phoneNumber = digits
      } else {
        // System-provisioned number — use a sentinel to indicate that
        body.useSystemNumber = 'true'
      }

      const res = await fetch('/api/integrations/twilio/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-agent-id': agentId,
        },
        body: JSON.stringify({ phoneNumber: mode === 'existing' ? digits : '0000000000', ...body }),
      })
      const data = await res.json()
      if (data.valid) {
        onComplete(mode === 'existing' ? digits : 'system')
      } else {
        setError(data.message || 'Failed to configure phone number. Please try again.')
      }
    } catch {
      setError('Connection failed. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-8 md:p-10">
        {/* Icon + Title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center mx-auto mb-4">
            <Phone className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Configure Your SMS Number</h2>
          <p className="text-slate-400 text-sm">
            Choose how your AI assistant texts leads — using LeadFlow's shared number or your own.
          </p>
        </div>

        {/* Mode selector */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => setMode('system')}
            className={`rounded-lg p-4 border-2 text-left transition-all ${
              mode === 'system'
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-slate-700 bg-slate-700/30 hover:border-slate-600'
            }`}
          >
            <div className="text-2xl mb-2">📱</div>
            <div className="font-medium text-white text-sm">Use LeadFlow Number</div>
            <div className="text-xs text-slate-400 mt-1">
              Shared LeadFlow number — no setup needed
            </div>
            {mode === 'system' && (
              <div className="text-xs text-blue-400 font-medium mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Selected
              </div>
            )}
          </button>

          <button
            onClick={() => setMode('existing')}
            className={`rounded-lg p-4 border-2 text-left transition-all ${
              mode === 'existing'
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-slate-700 bg-slate-700/30 hover:border-slate-600'
            }`}
          >
            <div className="text-2xl mb-2">🔧</div>
            <div className="font-medium text-white text-sm">Bring Your Own Number</div>
            <div className="text-xs text-slate-400 mt-1">
              Use an existing Twilio number you own
            </div>
            {mode === 'existing' && (
              <div className="text-xs text-blue-400 font-medium mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Selected
              </div>
            )}
          </button>
        </div>

        {/* Existing number input */}
        {mode === 'existing' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Your Twilio Phone Number (US only)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">+1</span>
              <input
                type="tel"
                value={formatPhoneDisplay(phoneInput)}
                onChange={handlePhoneChange}
                placeholder="(555) 000-0000"
                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              This must be a Twilio-provisioned number registered to your account.
            </p>
          </div>
        )}

        {/* System mode info */}
        {mode === 'system' && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-300">
              <span className="font-medium">LeadFlow will assign you a dedicated US number.</span>
              {' '}Your leads will receive texts from this number, and replies are routed back to your dashboard.
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm mb-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onBack}
            className="sm:flex-none px-4 py-3 text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 text-sm"
          >
            <span>←</span> Back
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || (mode === 'existing' && phoneInput.length < 10)}
            className="flex-1 bg-blue-500 hover:bg-blue-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : null}
            {isSaving ? 'Saving…' : 'Save & Continue'}
          </button>
          <button
            onClick={onSkip}
            className="sm:flex-none px-6 py-3 text-slate-400 hover:text-slate-200 font-medium transition-colors text-sm border border-slate-700 rounded-lg hover:border-slate-500"
          >
            Skip
          </button>
        </div>

        <p className="text-xs text-slate-500 text-center mt-4">
          You can change your SMS configuration later in{' '}
          <span className="text-slate-400">Settings → Integrations</span>
        </p>
      </div>
    </div>
  )
}
