'use client'

import { useState } from 'react'
import { Phone, AlertCircle, CheckCircle2, Info } from 'lucide-react'

export default function OnboardingSMS({
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
  const [smsPhoneNumber, setSmsPhoneNumber] = useState(agentData.smsPhoneNumber || '')
  const [testSent, setTestSent] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length <= 3) return cleaned
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`
    return `+1${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`
  }

  const validatePhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '')
    return cleaned.length === 10
  }

  const handleSendTest = async () => {
    setError('')
    setIsLoading(true)

    if (!validatePhone(smsPhoneNumber)) {
      setError('Please enter a valid 10-digit phone number')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/integrations/twilio/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: smsPhoneNumber.replace(/\D/g, ''),
          agentName: `${agentData.firstName} ${agentData.lastName}`,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        setError(data.message || 'Failed to send test SMS')
        return
      }

      setTestSent(true)
    } catch (err) {
      setError('Failed to send test SMS. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleContinue = () => {
    if (smsPhoneNumber.trim() && !validatePhone(smsPhoneNumber)) {
      setError('Please enter a valid 10-digit phone number')
      return
    }

    setAgentData({
      ...agentData,
      smsPhoneNumber: smsPhoneNumber.replace(/\D/g, ''),
    })

    onNext()
  }

  return (
    <div className="animate-in fade-in-up duration-500">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-8 md:p-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">SMS configuration</h2>
          <p className="text-slate-300">Connect your phone number for sending AI-powered messages</p>
        </div>

        {/* Info Box */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-8 flex gap-3">
          <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-blue-300 text-sm">
            We'll use Twilio to send messages on your behalf. SMS costs about $0.01 per message.
          </p>
        </div>

        {/* SMS Phone Number */}
        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              SMS Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 text-slate-500 w-5 h-5" />
              <input
                type="tel"
                value={smsPhoneNumber}
                onChange={(e) => {
                  setSmsPhoneNumber(formatPhone(e.target.value))
                  setTestSent(false)
                }}
                placeholder="+1 (555) 123-4567"
                maxLength={14}
                className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">
              This is the number leads will see SMS messages coming from
            </p>
          </div>

          {/* Send Test Button */}
          {smsPhoneNumber.trim() && !testSent && (
            <button
              onClick={handleSendTest}
              disabled={isLoading}
              className="w-full py-3 px-4 bg-blue-500/20 border border-blue-500/50 text-blue-300 hover:bg-blue-500/30 font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-blue-300/30 border-t-blue-300 rounded-full animate-spin" />
                  Sending test SMS...
                </>
              ) : (
                <>
                  <Phone className="w-5 h-5" />
                  Send Test SMS
                </>
              )}
            </button>
          )}

          {/* Test Sent Confirmation */}
          {testSent && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-emerald-400 font-medium text-sm">Test SMS sent!</p>
                <p className="text-emerald-300/70 text-xs mt-0.5">Check your phone for the message</p>
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

        {/* Features */}
        <div className="bg-slate-700/20 rounded-lg p-6 mb-8">
          <p className="text-sm font-semibold text-slate-200 mb-4">With SMS enabled, you get:</p>
          <ul className="space-y-2">
            {[
              'Instant lead qualification responses',
              'Appointment confirmations',
              'Follow-up message sequences',
              'Lead engagement tracking',
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-sm text-slate-300">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Optional Notice */}
        <div className="p-4 bg-slate-700/20 rounded-lg mb-8">
          <p className="text-slate-300 text-sm">
            ⚠️ <strong>Optional:</strong> You can skip this for now and configure SMS later.
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
