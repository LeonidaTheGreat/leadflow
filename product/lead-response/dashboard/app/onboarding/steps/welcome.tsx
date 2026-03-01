'use client'

import { useState } from 'react'
import { Mail, AlertCircle } from 'lucide-react'

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

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  }

  const handleContinue = async () => {
    setErrors({})
    const newErrors: Record<string, string> = {}

    // Validate email
    if (!email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    // Validate password
    if (!password) {
      newErrors.password = 'Password is required'
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }

    // Validate confirmation
    if (password !== confirmPassword) {
      newErrors.confirm = 'Passwords do not match'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsValidating(true)
    
    // Check if email exists
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

      // Save data and proceed
      setAgentData({
        ...agentData,
        email: email.toLowerCase(),
        password,
      })

      onNext()
    } catch (error) {
      console.error('Validation error:', error)
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
          Welcome to LeadFlow AI
        </h2>

        <p className="text-center text-slate-300 text-lg mb-8">
          Never miss a lead again. Respond to prospects in under 30 seconds.
        </p>

        {/* Form */}
        <div className="space-y-4 mb-8">
          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-slate-500 w-5 h-5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={`w-full pl-10 pr-4 py-3 bg-slate-700/50 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition ${
                  errors.email ? 'border-red-500/50' : 'border-slate-600/50'
                }`}
              />
            </div>
            {errors.email && (
              <div className="flex items-center gap-2 mt-2 text-sm text-red-400">
                <AlertCircle className="w-4 h-4" />
                {errors.email}
              </div>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className={`w-full px-4 py-3 bg-slate-700/50 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition ${
                errors.password ? 'border-red-500/50' : 'border-slate-600/50'
              }`}
            />
            {errors.password && (
              <div className="flex items-center gap-2 mt-2 text-sm text-red-400">
                <AlertCircle className="w-4 h-4" />
                {errors.password}
              </div>
            )}
          </div>

          {/* Confirm Password Field */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              className={`w-full px-4 py-3 bg-slate-700/50 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition ${
                errors.confirm ? 'border-red-500/50' : 'border-slate-600/50'
              }`}
            />
            {errors.confirm && (
              <div className="flex items-center gap-2 mt-2 text-sm text-red-400">
                <AlertCircle className="w-4 h-4" />
                {errors.confirm}
              </div>
            )}
          </div>

          {errors.submit && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
              <AlertCircle className="w-4 h-4" />
              {errors.submit}
            </div>
          )}
        </div>

        {/* CTA Button */}
        <button
          onClick={handleContinue}
          disabled={isValidating}
          className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isValidating ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Validating...
            </>
          ) : (
            <>
              Continue <span>→</span>
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
            What you get
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
