'use client'

import { useState } from 'react'
import { Calendar, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function OnboardingCalendar({
  onNext,
  onBack,
  agentData,
  setAgentData,
}: {
  onNext: () => void
  onBack: () => void
  agentData: any
  setAgentData: (data: any) => void
}) {
  const [calcomLink, setCalcomLink] = useState(agentData.calcomLink || '')
  const [isVerifying, setIsVerifying] = useState(false)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState('')

  const handleVerifyLink = async () => {
    setError('')
    setIsVerifying(true)

    try {
      // Validate Cal.com link format
      if (!calcomLink.includes('cal.com')) {
        setError('Please enter a valid Cal.com booking link')
        return
      }

      const response = await fetch('/api/integrations/cal-com/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calcomLink }),
      })

      const data = await response.json()

      if (!data.valid) {
        setError('This booking link is not accessible. Please check the URL.')
        return
      }

      setVerified(true)
    } catch (err) {
      setError('Failed to verify booking link. Please try again.')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleContinue = () => {
    if (!verified && calcomLink.trim()) {
      setError('Please verify your booking link first')
      return
    }

    setAgentData({
      ...agentData,
      calcomLink: calcomLink.trim(),
    })

    onNext()
  }

  return (
    <div className="animate-in fade-in-up duration-500">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-8 md:p-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Connect your calendar</h2>
          <p className="text-slate-300">
            Let leads book meetings directly from our AI responses
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-8">
          <p className="text-blue-300 text-sm">
            💡 Leads can book appointments with you instantly. Your calendar stays in sync
            with Cal.com and prevents double bookings.
          </p>
        </div>

        {/* Calendar Setup */}
        <div className="space-y-6 mb-8">
          {/* Cal.com Link Input */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Your Cal.com Booking Link
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 text-slate-500 w-5 h-5" />
              <input
                type="url"
                value={calcomLink}
                onChange={(e) => {
                  setCalcomLink(e.target.value)
                  setVerified(false)
                }}
                placeholder="https://cal.com/yourname"
                className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Don't have Cal.com yet?{' '}
              <a
                href="https://cal.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:text-emerald-300"
              >
                Create a free account
              </a>
            </p>
          </div>

          {/* Verify Button */}
          {calcomLink.trim() && !verified && (
            <button
              onClick={handleVerifyLink}
              disabled={isVerifying}
              className="w-full py-3 px-4 bg-blue-500/20 border border-blue-500/50 text-blue-300 hover:bg-blue-500/30 font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <>
                  <div className="w-4 h-4 border-2 border-blue-300/30 border-t-blue-300 rounded-full animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Calendar className="w-5 h-5" />
                  Verify Booking Link
                </>
              )}
            </button>
          )}

          {/* Verified State */}
          {verified && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-emerald-400 font-medium text-sm">Booking link verified!</p>
                <p className="text-emerald-300/70 text-xs mt-0.5">Leads can now book with you</p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Optional Notice */}
        <div className="p-4 bg-slate-700/20 rounded-lg mb-8">
          <p className="text-slate-300 text-sm">
            ⚠️ <strong>Optional:</strong> You can skip this for now and set it up later in
            your dashboard.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 px-4 py-3 border border-slate-600/50 text-slate-300 font-semibold rounded-lg hover:bg-slate-700/30 transition-all duration-200"
          >
            ← Back
          </button>
          <button
            onClick={handleContinue}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  )
}
