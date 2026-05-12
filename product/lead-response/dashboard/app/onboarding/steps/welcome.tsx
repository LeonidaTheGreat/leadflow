'use client'

import { useState } from 'react'
import { Mail, AlertCircle } from 'lucide-react'
import FormField from '../components/form-field'
import FormInput from '../components/form-input'
import FormPasswordInput from '../components/form-password'

export default function OnboardingWelcome({
  onNext,
  agentData,
  setAgentData,
}: {
  onNext: () => void
  agentData: any
  setAgentData: (data: any) => void
}) {
  const [email, setEmail] = useState(agentData.email || '')
  const [password, setPassword] = useState(agentData.password || '')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isValidating, setIsValidating] = useState(false)

  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

  const handleContinue = async () => {
    setErrors({})
    const newErrors: Record<string, string> = {}

    if (!email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!password) {
      newErrors.password = 'Password is required'
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }

    if (password !== confirmPassword) {
      newErrors.confirm = 'Passwords do not match'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsValidating(true)
    try {
      const response = await fetch('/api/agents/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!data.available) {
        setErrors({ email: 'Email is already registered' })
        return
      }

      setAgentData({ ...agentData, email: email.toLowerCase(), password })
      onNext()
    } catch {
      setErrors({ submit: 'Failed to validate email. Please try again.' })
    } finally {
      setIsValidating(false)
    }
  }

  return (
    <div className="animate-in fade-in-up duration-500">
      {/* Welcome Card */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-8 md:p-12">
        {/* Icon */}
        <div className="w-16 h-16 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center mx-auto mb-6">
          <div className="text-3xl">🚀</div>
        </div>

        {/* Title */}
        <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-3">
          Start Your Free Pilot
        </h2>
        <p className="text-center text-slate-300 text-lg mb-4">
          Never miss a lead again. Respond to prospects in under 30 seconds.
        </p>

        {/* Free pilot badge */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-sm font-medium">
            ✨ 60 days free — no credit card required
          </span>
        </div>

        {/* Form */}
        <div className="space-y-4 mb-8">
          <FormField label="Email Address" htmlFor="welcome-email" error={errors.email}>
            <FormInput
              id="welcome-email"
              data-testid="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setErrors((p) => ({ ...p, email: '' }))
              }}
              placeholder="you@example.com"
              hasError={!!errors.email}
              icon={<Mail className="w-5 h-5" />}
            />
          </FormField>

          <FormField label="Password" htmlFor="welcome-password" error={errors.password}>
            <FormPasswordInput
              id="welcome-password"
              data-testid="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setErrors((p) => ({ ...p, password: '' }))
              }}
              placeholder="At least 8 characters"
              hasError={!!errors.password}
            />
          </FormField>

          <FormField label="Confirm Password" htmlFor="welcome-confirm" error={errors.confirm}>
            <FormPasswordInput
              id="welcome-confirm"
              data-testid="confirm-password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                setErrors((p) => ({ ...p, confirm: '' }))
              }}
              placeholder="Confirm your password"
              hasError={!!errors.confirm}
            />
          </FormField>

          {errors.submit && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {errors.submit}
            </div>
          )}
        </div>

        {/* CTA Button */}
        <button
          onClick={handleContinue}
          disabled={isValidating}
          className="w-full py-3 px-4 min-h-[44px] bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isValidating ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Validating...
            </>
          ) : (
            <>
              Start Free Pilot <span>→</span>
            </>
          )}
        </button>

        {/* Terms */}
        <p className="text-xs text-slate-400 text-center mt-6">
          By signing up, you agree to our{' '}
          <a href="/terms" className="text-emerald-400 hover:text-emerald-300">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" className="text-emerald-400 hover:text-emerald-300">
            Privacy Policy
          </a>
        </p>

        {/* Benefits */}
        <div className="mt-8 pt-6 border-t border-slate-700/50">
          <p className="text-xs font-semibold text-slate-300 mb-3 uppercase tracking-wide">
            Included in your free pilot
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { icon: '⚡', label: '<30s responses' },
              { icon: '🤖', label: 'AI qualification' },
              { icon: '📅', label: 'Calendar sync' },
            ].map((benefit) => (
              <div key={benefit.label} className="flex items-center gap-2 text-sm text-slate-300">
                <span className="text-lg">{benefit.icon}</span>
                {benefit.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-slate-400 text-sm mt-6">
        Already have an account?{' '}
        <a href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium">
          Sign in
        </a>
      </p>
    </div>
  )
}
