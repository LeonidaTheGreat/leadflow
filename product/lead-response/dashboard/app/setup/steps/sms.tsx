'use client'

import { useState } from 'react'
import { Phone, AlertCircle, CheckCircle2, MessageSquare, Send } from 'lucide-react'

interface SetupSMSProps {
  onNext: () => void
  onBack: () => void
  setupData: {
    smsConnected: boolean
    smsPhoneNumber: string
  }
  setSetupData: (data: any) => void
}

export default function SetupSMS({ onNext, onBack, setupData, setSetupData }: SetupSMSProps) {
  const [phoneNumber, setPhoneNumber] = useState(setupData.smsPhoneNumber || '')
  const [testCode, setTestCode] = useState('')
  const [step, setStep] = useState<'input' | 'sending' | 'sent' | 'verified'>(
    setupData.smsConnected ? 'verified' : 'input'
  )
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const validatePhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '')
    return cleaned.length === 10
  }

  const handleSendTest = async () => {
    setError('')
    
    if (!validatePhone(phoneNumber)) {
      setError('Please enter a valid 10-digit phone number')
      return
    }

    setIsLoading(true)
    setStep('sending')

    try {
      const response = await fetch('/api/setup/send-test-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber })
      })

      if (!response.ok) {
        throw new Error('Failed to send test SMS')
      }

      setStep('sent')
    } catch (err) {
      setError('Failed to send test SMS. Please try again.')
      setStep('input')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerify = async () => {
    setError('')
    setIsLoading(true)

    try {
      // For demo purposes, we'll accept any 4-digit code
      // In production, this would verify against the actual sent code
      if (testCode.length !== 4) {
        setError('Please enter the 4-digit code')
        return
      }

      setStep('verified')
      setSetupData({ ...setupData, smsConnected: true, smsPhoneNumber: phoneNumber })
      
      // Log event
      await fetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'wizard_step_completed',
          properties: { step_name: 'sms', success: true }
        })
      }).catch(() => {})
    } catch (err) {
      setError('Verification failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleContinue = () => {
    setSetupData({
      ...setupData,
      smsConnected: step === 'verified',
      smsPhoneNumber: phoneNumber,
    })
    onNext()
  }

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length <= 3) return cleaned
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`
  }

  return (
    <div className="animate-in fade-in-up duration-500">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-8 md:p-12">
        <div className="mb-8">
          <div className="w-16 h-16 rounded-xl bg-blue-500/20 border border-blue-500/50 flex items-center justify-center mx-auto mb-6">
            <MessageSquare className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-3xl font-bold text-white text-center mb-2">Configure SMS</h2>
          <p className="text-slate-300 text-center">
            Set up your phone number for AI-powered SMS responses
          </p>
        </div>

        {/* Step 1: Phone Input */}
        {step === 'input' && (
          <div className="space-y-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Your Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 text-slate-500 w-5 h-5" />
                <input
                  type="tel"
                  value={formatPhone(phoneNumber)}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="(555) 123-4567"
                  maxLength={14}
                  className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>
              <p className="text-xs text-slate-400 mt-2">
                We'll send a test message to verify your number
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleSendTest}
              disabled={isLoading || phoneNumber.length < 10}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send Test Message
                </>
              )}
            </button>
          </div>
        )}

        {/* Step 2: Sending */}
        {step === 'sending' && (
          <div className="text-center py-8 mb-8">
            <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white font-medium">Sending test message...</p>
            <p className="text-slate-400 text-sm mt-2">This may take a few seconds</p>
          </div>
        )}

        {/* Step 3: Code Verification */}
        {step === 'sent' && (
          <div className="space-y-6 mb-8">
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-blue-300 text-sm">
                We've sent a 4-digit code to <strong className="text-white">{formatPhone(phoneNumber)}</strong>. 
                Enter it below to verify.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Verification Code
              </label>
              <input
                type="text"
                value={testCode}
                onChange={(e) => setTestCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="0000"
                maxLength={4}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition text-center text-2xl tracking-widest"
              />
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep('input')}
                className="flex-1 px-4 py-3 border border-slate-600/50 text-slate-300 font-semibold rounded-lg hover:bg-slate-700/30 transition-all duration-200"
              >
                Back
              </button>
              <button
                onClick={handleVerify}
                disabled={isLoading || testCode.length !== 4}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-all duration-200"
              >
                {isLoading ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Verified */}
        {step === 'verified' && (
          <div className="mb-8">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-emerald-400 font-medium text-sm">SMS configured!</p>
                <p className="text-emerald-300/70 text-xs mt-0.5">
                  Your AI assistant will respond to leads at {formatPhone(phoneNumber)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Features */}
        <div className="bg-slate-700/20 rounded-lg p-6 mb-8">
          <p className="text-sm font-semibold text-slate-200 mb-4">With SMS configured:</p>
          <ul className="space-y-2">
            {[
              'AI responds to leads within 30 seconds',
              'Two-way SMS conversations',
              'Automatic follow-up sequences',
              'Lead qualification via text',
              'Appointment booking via SMS',
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-sm text-slate-300">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                {feature}
              </li>
            ))}
          </ul>
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
