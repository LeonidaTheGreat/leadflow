'use client'

import { useState } from 'react'
import { MessageSquare, Phone, AlertCircle, CheckCircle2, Smartphone } from 'lucide-react'

interface Props {
  agentId: string
  agentName: string
  twilioPhone: string
  onComplete: (agentPhone: string) => void
  onSkip: () => void
  onBack: () => void
}

function formatPhoneDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 0) return ''
  if (digits.length <= 3) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
}

export default function SetupSMSVerify({ agentId, agentName, twilioPhone, onComplete, onSkip, onBack }: Props) {
  const [mobileInput, setMobileInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 10)
    setMobileInput(raw)
    setError('')
    setSent(false)
  }

  const handleSendTest = async () => {
    const digits = mobileInput.replace(/\D/g, '')
    if (digits.length !== 10) {
      setError('Please enter a valid 10-digit US phone number.')
      return
    }

    setIsSending(true)
    setError('')
    try {
      const res = await fetch('/api/integrations/twilio/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: digits,
          agentName: agentName || 'Agent',
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSent(true)
      } else {
        setError(data.message || 'Failed to send test SMS. Please try again.')
      }
    } catch {
      setError('Failed to send test SMS. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  const handleConfirm = () => {
    onComplete(mobileInput)
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-8 md:p-10">
        {/* Icon + Title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Verify SMS</h2>
          <p className="text-slate-400 text-sm">
            Send a test message to your mobile to confirm everything's working.
          </p>
        </div>

        {/* Preview */}
        <div className="bg-slate-700/30 border border-slate-600/30 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Preview SMS</p>
              <div className="bg-slate-600/50 rounded-lg rounded-tl-none px-4 py-3 max-w-xs">
                <p className="text-sm text-slate-200">
                  Hi! This is a test message from LeadFlow AI. Your SMS integration is working.
                  Test sent by: <strong>{agentName || 'Agent'}</strong>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile number input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Your Mobile Number
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">+1</span>
            <input
              type="tel"
              value={formatPhoneDisplay(mobileInput)}
              onChange={handleMobileChange}
              placeholder="(555) 000-0000"
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">Enter your personal mobile to receive the test.</p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm mb-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Sent confirmation */}
        {sent && (
          <div className="flex items-center gap-2 text-emerald-400 text-sm mb-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Test SMS sent! Check your phone — if you received it, click "SMS Working ✓" below.
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

          {!sent ? (
            <button
              onClick={handleSendTest}
              disabled={isSending || mobileInput.length < 10}
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isSending ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : <MessageSquare className="w-4 h-4" />}
              {isSending ? 'Sending…' : 'Send Test SMS'}
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              SMS Working ✓
            </button>
          )}

          <button
            onClick={onSkip}
            className="sm:flex-none px-6 py-3 text-slate-400 hover:text-slate-200 font-medium transition-colors text-sm border border-slate-700 rounded-lg hover:border-slate-500"
          >
            Skip
          </button>
        </div>

        {sent && (
          <button
            onClick={() => { setSent(false); setMobileInput('') }}
            className="w-full text-center text-xs text-slate-500 hover:text-slate-400 mt-3 transition-colors"
          >
            Didn't receive it? Try a different number
          </button>
        )}

        <p className="text-xs text-slate-500 text-center mt-4">
          SMS verification can be done later in{' '}
          <span className="text-slate-400">Settings → Integrations</span>
        </p>
      </div>
    </div>
  )
}
