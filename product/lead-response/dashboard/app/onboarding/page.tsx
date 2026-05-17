'use client'

/*
taskSpec:
What:
- Update /product/lead-response/dashboard/app/onboarding/page.tsx (OnboardingPageInner, AgentFormData, step configuration) to wire simulator step into wizard, add Aha fields, and include aha_moment_completed in onboard submit payload.
Verify:
- Run: node product/lead-response/dashboard/tests/fix-page-tsx-not-updated-simulator-step-not-wired-into.test.js (expect all pass).
- Run: npm test (expect pass).
- Run: npm run build (expect successful build).
- Grep checks in page.tsx for simulator import/type/steps/render and aha_moment_completed payload key.
Boundaries:
- Do not modify simulator step implementation file or API route behavior beyond this page payload wiring.
- Do not change unrelated onboarding flows outside app/onboarding/page.tsx.
*/

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useRef, Suspense } from 'react'
import {
  Mail, Lock, Eye, EyeOff, User, Phone, MapPin, Link2, MessageSquare,
  Check, AlertCircle, CheckCircle, Wifi, WifiOff
} from 'lucide-react'
import OnboardingSimulator from './steps/simulator'

// ─── Types ────────────────────────────────────────────────────────────────────

type OnboardingStep = 'welcome' | 'agent-info' | 'calendar' | 'sms' | 'simulator' | 'confirmation'

type StepId = 'account' | 'profile' | 'integrations' | 'simulator' | 'confirm'

interface AgentFormData {
  ahaCompleted: boolean
  ahaResponseTimeMs: number | null
  ahaSkipped: boolean
  // Step 1: Account
  email: string
  password: string
  // Step 2: Profile
  firstName: string
  lastName: string
  phoneNumber: string
  state: string
  // Step 3: Integrations (optional)
  calcomLink: string
  smsPhoneNumber: string
  // Step 4: Confirm
  termsAccepted: boolean
  // UTM
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmContent: string | null
  utmTerm: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS: { id: StepId; label: string }[] = [
  { id: 'account', label: 'Account' },
  { id: 'profile', label: 'Profile' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'simulator', label: 'Simulator' },
  { id: 'confirm', label: 'Confirm' },
]

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming'
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readUtmParams(searchParams: ReturnType<typeof useSearchParams>) {
  const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const
  let stored: Record<string, string> = {}
  try {
    const raw = sessionStorage.getItem('leadflow_utm')
    if (raw) stored = JSON.parse(raw)
  } catch { /* SSR safety */ }
  const fromUrl: Record<string, string> = {}
  UTM_KEYS.forEach((key) => { const v = searchParams.get(key); if (v) fromUrl[key] = v })
  const merged = { ...stored, ...fromUrl }
  return {
    utmSource: merged['utm_source'] ?? null,
    utmMedium: merged['utm_medium'] ?? null,
    utmCampaign: merged['utm_campaign'] ?? null,
    utmContent: merged['utm_content'] ?? null,
    utmTerm: merged['utm_term'] ?? null,
  }
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validatePassword(password: string): string[] {
  const errors: string[] = []
  if (password.length < 8) errors.push('Password must be at least 8 characters')
  if (!/[A-Z]/.test(password)) errors.push('Password must contain an uppercase letter')
  if (!/[a-z]/.test(password)) errors.push('Password must contain a lowercase letter')
  if (!/[0-9]/.test(password)) errors.push('Password must contain a number')
  return errors
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({
  currentIndex,
  completedSteps,
}: {
  currentIndex: number
  completedSteps: Set<number>
}) {
  return (
    <div className="flex items-center justify-center gap-2 py-4 px-4">
      {STEPS.map((step, i) => {
        const isCompleted = completedSteps.has(i)
        const isActive = i === currentIndex
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                aria-current={isActive ? 'step' : undefined}
                data-testid={isActive ? 'current-step' : undefined}
                className={[
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all',
                  isCompleted
                    ? 'bg-emerald-500 text-white'
                    : isActive
                    ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500 ring-2 ring-emerald-500/40'
                    : 'bg-slate-700 text-slate-400 border border-slate-600',
                ].join(' ')}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  String(i + 1)
                )}
              </button>
              <span
                className={[
                  'text-xs font-medium hidden sm:block',
                  isActive ? 'text-emerald-400' : isCompleted ? 'text-emerald-500/70' : 'text-slate-500',
                ].join(' ')}
              >
                {step.label}
              </span>
              {/* Always show at least one step label on mobile for the active step */}
              {isActive && (
                <span className="text-xs font-medium text-emerald-400 sm:hidden">{step.label}</span>
              )}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={[
                  'w-8 sm:w-16 h-px mx-1 sm:mx-2',
                  completedSteps.has(i) ? 'bg-emerald-500' : 'bg-slate-700',
                ].join(' ')}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ currentIndex, total }: { currentIndex: number; total: number }) {
  const pct = Math.round(((currentIndex + 1) / total) * 100)
  return (
    <div className="px-4 pb-4">
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Onboarding progress"
        className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden"
      >
        <div
          className="h-full bg-primary bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-slate-400 mt-1 text-right">
        Step {currentIndex + 1} of {total}
      </p>
    </div>
  )
}

// ─── Step 1: Account ──────────────────────────────────────────────────────────

function StepAccount({
  data,
  onChange,
  onNext,
  isValidating,
  networkError,
  emailError,
}: {
  data: AgentFormData
  onChange: (partial: Partial<AgentFormData>) => void
  onNext: () => void
  isValidating: boolean
  networkError: string | null
  emailError: string | null
}) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}

    if (!data.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!validateEmail(data.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (emailError) {
      newErrors.email = emailError
    }

    const pwdErrors = validatePassword(data.password)
    if (!data.password) {
      newErrors.password = 'Password is required'
    } else if (pwdErrors.length > 0) {
      newErrors.password = pwdErrors[0]
    }

    if (confirmPassword !== data.password) {
      newErrors.confirm = 'Passwords do not match'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    onNext()
  }

  // Merge external email error into local errors
  useEffect(() => {
    if (emailError) setErrors((prev) => ({ ...prev, email: emailError }))
  }, [emailError])

  const passwordErrors = validatePassword(data.password)
  const passwordStrength = data.password.length === 0 ? null : passwordErrors.length === 0 ? 'strong' : 'weak'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-white">Create Your Account</h2>
        <p className="text-slate-400 mt-1">Start your free pilot — no credit card required</p>
      </div>

      {/* Network Error Banner */}
      {networkError && (
        <div role="alert" className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          {networkError}
          <button
            type="button"
            className="ml-auto underline hover:text-red-300"
            onClick={() => onNext()}
          >
            Retry
          </button>
        </div>
      )}

      {/* Email */}
      <div>
        <label htmlFor="onboarding-email" className="block text-sm font-medium text-slate-200 mb-1.5">
          Email Address
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 text-slate-500 w-5 h-5" />
          <input
            id="onboarding-email"
            type="email"
            name="email"
            autoComplete="email"
            value={data.email}
            onChange={(e) => { onChange({ email: e.target.value }); setErrors((p) => ({ ...p, email: '' })) }}
            onBlur={() => {
              if (data.email && validateEmail(data.email)) {
                // trigger parent email availability check
                const ev = new CustomEvent('onboarding:check-email', { detail: data.email })
                window.dispatchEvent(ev)
              }
            }}
            placeholder="you@example.com"
            className={`w-full pl-10 pr-4 py-3 min-h-[44px] bg-slate-700/50 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition ${
              errors.email ? 'border-red-500/50' : 'border-slate-600/50'
            }`}
          />
        </div>
        {errors.email && (
          <p role="alert" className="flex items-center gap-1.5 mt-1.5 text-sm text-red-400">
            <AlertCircle className="w-4 h-4" /> {errors.email}
          </p>
        )}
      </div>

      {/* Password */}
      <div>
        <label htmlFor="onboarding-password" className="block text-sm font-medium text-slate-200 mb-1.5">
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 text-slate-500 w-5 h-5" />
          <input
            id="onboarding-password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            autoComplete="new-password"
            value={data.password}
            onChange={(e) => { onChange({ password: e.target.value }); setErrors((p) => ({ ...p, password: '' })) }}
            placeholder="At least 8 characters"
            className={`w-full pl-10 pr-10 py-3 min-h-[44px] bg-slate-700/50 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition ${
              errors.password ? 'border-red-500/50' : 'border-slate-600/50'
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {errors.password && (
          <p role="alert" className="flex items-center gap-1.5 mt-1.5 text-sm text-red-400">
            <AlertCircle className="w-4 h-4" /> {errors.password}
          </p>
        )}
        {/* Password strength hints (only shown when typing) */}
        {data.password.length > 0 && passwordErrors.length > 0 && !errors.password && (
          <ul className="mt-2 space-y-1">
            {!(/[A-Z]/.test(data.password)) && (
              <li className="text-xs text-amber-400">• Must contain an uppercase letter</li>
            )}
            {!(/[a-z]/.test(data.password)) && (
              <li className="text-xs text-amber-400">• Must contain a lowercase letter</li>
            )}
            {!(/[0-9]/.test(data.password)) && (
              <li className="text-xs text-amber-400">• Must contain a number or digit</li>
            )}
          </ul>
        )}
      </div>

      {/* Confirm Password */}
      <div>
        <label htmlFor="onboarding-confirm-password" className="block text-sm font-medium text-slate-200 mb-1.5">
          Confirm Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 text-slate-500 w-5 h-5" />
          <input
            id="onboarding-confirm-password"
            type={showConfirm ? 'text' : 'password'}
            name="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setErrors((p) => ({ ...p, confirm: '' })) }}
            placeholder="Confirm your password"
            className={`w-full pl-10 pr-10 py-3 min-h-[44px] bg-slate-700/50 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition ${
              errors.confirm ? 'border-red-500/50' : 'border-slate-600/50'
            }`}
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
            aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
          >
            {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {errors.confirm && (
          <p role="alert" className="flex items-center gap-1.5 mt-1.5 text-sm text-red-400">
            <AlertCircle className="w-4 h-4" /> {errors.confirm}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isValidating}
        className="w-full min-h-[44px] py-3 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isValidating ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Validating...
          </>
        ) : (
          'Next →'
        )}
      </button>
    </form>
  )
}

// ─── Step 2: Profile ──────────────────────────────────────────────────────────

function StepProfile({
  data,
  onChange,
  onNext,
  onBack,
  networkError,
}: {
  data: AgentFormData
  onChange: (partial: Partial<AgentFormData>) => void
  onNext: () => void
  onBack: () => void
  networkError: string | null
}) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [stateOpen, setStateOpen] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    if (!data.firstName.trim()) newErrors.firstName = 'First name is required'
    if (!data.lastName.trim()) newErrors.lastName = 'Last name is required'
    if (!data.phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required'
    else if (data.phoneNumber.replace(/\D/g, '').length !== 10) newErrors.phoneNumber = 'Please enter a valid 10-digit phone number'
    if (!data.state) newErrors.state = 'State is required'
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }
    setErrors({})
    onNext()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-white">Your Profile</h2>
        <p className="text-slate-400 mt-1">Tell us a bit about yourself</p>
      </div>

      {networkError && (
        <div role="alert" className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          <WifiOff className="w-4 h-4 flex-shrink-0" /> {networkError}
        </div>
      )}

      {/* First Name */}
      <div>
        <label htmlFor="onboarding-first-name" className="block text-sm font-medium text-slate-200 mb-1.5">
          First Name
        </label>
        <div className="relative">
          <User className="absolute left-3 top-3 text-slate-500 w-5 h-5" />
          <input
            id="onboarding-first-name"
            type="text"
            name="firstName"
            autoComplete="given-name"
            value={data.firstName}
            onChange={(e) => { onChange({ firstName: e.target.value }); setErrors((p) => ({ ...p, firstName: '' })) }}
            placeholder="John"
            className={`w-full pl-10 pr-4 py-3 min-h-[44px] bg-slate-700/50 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition ${
              errors.firstName ? 'border-red-500/50' : 'border-slate-600/50'
            }`}
          />
        </div>
        {errors.firstName && (
          <p role="alert" className="flex items-center gap-1.5 mt-1.5 text-sm text-red-400">
            <AlertCircle className="w-4 h-4" /> {errors.firstName}
          </p>
        )}
      </div>

      {/* Last Name */}
      <div>
        <label htmlFor="onboarding-last-name" className="block text-sm font-medium text-slate-200 mb-1.5">
          Last Name
        </label>
        <input
          id="onboarding-last-name"
          type="text"
          name="lastName"
          autoComplete="family-name"
          value={data.lastName}
          onChange={(e) => { onChange({ lastName: e.target.value }); setErrors((p) => ({ ...p, lastName: '' })) }}
          placeholder="Smith"
          className={`w-full px-4 py-3 min-h-[44px] bg-slate-700/50 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition ${
            errors.lastName ? 'border-red-500/50' : 'border-slate-600/50'
          }`}
        />
        {errors.lastName && (
          <p role="alert" className="flex items-center gap-1.5 mt-1.5 text-sm text-red-400">
            <AlertCircle className="w-4 h-4" /> {errors.lastName}
          </p>
        )}
      </div>

      {/* Phone Number */}
      <div>
        <label htmlFor="onboarding-phone" className="block text-sm font-medium text-slate-200 mb-1.5">
          Phone Number
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-3 text-slate-500 w-5 h-5" />
          <input
            id="onboarding-phone"
            type="tel"
            name="phoneNumber"
            autoComplete="tel"
            value={data.phoneNumber}
            onChange={(e) => { onChange({ phoneNumber: e.target.value }); setErrors((p) => ({ ...p, phoneNumber: '' })) }}
            placeholder="5551234567"
            className={`w-full pl-10 pr-4 py-3 min-h-[44px] bg-slate-700/50 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition ${
              errors.phoneNumber ? 'border-red-500/50' : 'border-slate-600/50'
            }`}
          />
        </div>
        {errors.phoneNumber && (
          <p role="alert" className="flex items-center gap-1.5 mt-1.5 text-sm text-red-400">
            <AlertCircle className="w-4 h-4" /> {errors.phoneNumber}
          </p>
        )}
      </div>

      {/* State */}
      <div className="relative">
        <label htmlFor="onboarding-state" className="block text-sm font-medium text-slate-200 mb-1.5">
          Operating State
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 text-slate-500 w-5 h-5 pointer-events-none" />
          <select
            id="onboarding-state"
            name="state"
            role="combobox"
            aria-label="State"
            value={data.state}
            onChange={(e) => { onChange({ state: e.target.value }); setErrors((p) => ({ ...p, state: '' })) }}
            className={`w-full pl-10 pr-4 py-3 min-h-[44px] bg-slate-700/50 border rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition appearance-none ${
              errors.state ? 'border-red-500/50' : 'border-slate-600/50'
            } ${!data.state ? 'text-slate-400' : ''}`}
          >
            <option value="">Select your state...</option>
            {US_STATES.map((s) => (
              <option key={s} value={s} role="option">{s}</option>
            ))}
          </select>
        </div>
        {errors.state && (
          <p role="alert" className="flex items-center gap-1.5 mt-1.5 text-sm text-red-400">
            <AlertCircle className="w-4 h-4" /> {errors.state}
          </p>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 min-h-[44px] px-4 py-3 border border-slate-600/50 text-slate-300 font-semibold rounded-lg hover:bg-slate-700/30 transition-all duration-200"
        >
          ← Previous
        </button>
        <button
          type="submit"
          className="flex-1 min-h-[44px] py-3 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-200"
        >
          Next →
        </button>
      </div>
    </form>
  )
}

// ─── Step 3: Integrations ─────────────────────────────────────────────────────

function StepIntegrations({
  data,
  onChange,
  onNext,
  onBack,
  networkError,
}: {
  data: AgentFormData
  onChange: (partial: Partial<AgentFormData>) => void
  onNext: () => void
  onBack: () => void
  networkError: string | null
}) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onNext()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-white">Integrations</h2>
        <p className="text-slate-400 mt-1">
          Connect your tools — all fields are <span className="text-emerald-400 font-medium">optional</span> and can be added later
        </p>
      </div>

      {networkError && (
        <div role="alert" className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          <WifiOff className="w-4 h-4 flex-shrink-0" /> {networkError}
        </div>
      )}

      {/* Cal.com Link */}
      <div>
        <label htmlFor="onboarding-calcom" className="block text-sm font-medium text-slate-200 mb-1.5">
          Cal.com Booking Link
          <span className="ml-2 text-xs text-slate-400 font-normal">(optional)</span>
        </label>
        <div className="relative">
          <Link2 className="absolute left-3 top-3 text-slate-500 w-5 h-5" />
          <input
            id="onboarding-calcom"
            type="url"
            name="calcomLink"
            value={data.calcomLink}
            onChange={(e) => onChange({ calcomLink: e.target.value })}
            placeholder="https://cal.com/your-username"
            className="w-full pl-10 pr-4 py-3 min-h-[44px] bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
          />
        </div>
      </div>

      {/* SMS Phone Number */}
      <div>
        <label htmlFor="onboarding-sms-phone" className="block text-sm font-medium text-slate-200 mb-1.5">
          SMS Phone Number
          <span className="ml-2 text-xs text-slate-400 font-normal">(optional)</span>
        </label>
        <div className="relative">
          <MessageSquare className="absolute left-3 top-3 text-slate-500 w-5 h-5" />
          <input
            id="onboarding-sms-phone"
            type="tel"
            name="smsPhoneNumber"
            value={data.smsPhoneNumber}
            onChange={(e) => onChange({ smsPhoneNumber: e.target.value })}
            placeholder="5559876543"
            className="w-full pl-10 pr-4 py-3 min-h-[44px] bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 min-h-[44px] px-4 py-3 border border-slate-600/50 text-slate-300 font-semibold rounded-lg hover:bg-slate-700/30 transition-all duration-200"
        >
          ← Previous
        </button>
        <button
          type="submit"
          className="flex-1 min-h-[44px] py-3 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-200"
        >
          Next →
        </button>
      </div>
    </form>
  )
}

// ─── Step 4: Confirm ──────────────────────────────────────────────────────────

function StepConfirm({
  data,
  onChange,
  onComplete,
  onBack,
  isSubmitting,
  submitError,
  networkError,
  successState,
}: {
  data: AgentFormData
  onChange: (partial: Partial<AgentFormData>) => void
  onComplete: () => void
  onBack: () => void
  isSubmitting: boolean
  submitError: string | null
  networkError: string | null
  successState: boolean
}) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!data.termsAccepted) {
      setErrors({ terms: 'You must accept the terms to continue' })
      return
    }
    setErrors({})
    onComplete()
  }

  if (successState) {
    return (
      <div className="text-center py-8">
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-emerald-400" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-3">Welcome to LeadFlow!</h2>
        <p className="text-slate-300 text-lg mb-2">Your account has been created successfully.</p>
        <p className="text-slate-400 text-sm">Redirecting you to the dashboard…</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-white">Review your information</h2>
        <p className="text-slate-400 mt-1">Make sure everything looks good before we create your account</p>
      </div>

      {/* Summary */}
      <div className="space-y-3 p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Account</p>
          <p className="text-white mt-0.5">{data.email}</p>
        </div>
        {(data.firstName || data.lastName) && (
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Profile</p>
            <p className="text-white mt-0.5">{[data.firstName, data.lastName].filter(Boolean).join(' ')}</p>
            {data.phoneNumber && <p className="text-slate-300 text-sm">{data.phoneNumber}</p>}
            {data.state && <p className="text-slate-300 text-sm">{data.state}</p>}
          </div>
        )}
        {(data.calcomLink || data.smsPhoneNumber) && (
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Integrations</p>
            {data.calcomLink && <p className="text-slate-300 text-sm truncate">{data.calcomLink}</p>}
            {data.smsPhoneNumber && <p className="text-slate-300 text-sm">{data.smsPhoneNumber}</p>}
          </div>
        )}
      </div>

      {/* Network / Submit Error */}
      {(networkError || submitError) && (
        <div role="alert" className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {networkError || submitError}
          <button type="button" onClick={onComplete} className="ml-auto underline hover:text-red-300">
            Try again
          </button>
        </div>
      )}

      {/* Terms */}
      <div>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="terms"
            checked={data.termsAccepted}
            onChange={(e) => { onChange({ termsAccepted: e.target.checked }); setErrors({}) }}
            className="mt-1 w-5 h-5 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900 min-h-[44px] cursor-pointer"
          />
          <span className="text-sm text-slate-300">
            I agree to the{' '}
            <a href="/terms" className="text-emerald-400 hover:text-emerald-300 underline">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" className="text-emerald-400 hover:text-emerald-300 underline">Privacy Policy</a>
          </span>
        </label>
        {errors.terms && (
          <p role="alert" className="flex items-center gap-1.5 mt-1.5 text-sm text-red-400">
            <AlertCircle className="w-4 h-4" /> {errors.terms}
          </p>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1 min-h-[44px] px-4 py-3 border border-slate-600/50 text-slate-300 font-semibold rounded-lg hover:bg-slate-700/30 transition-all duration-200 disabled:opacity-50"
        >
          ← Previous
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 min-h-[44px] py-3 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creating account…
            </>
          ) : (
            'Complete ✓'
          )}
        </button>
      </div>
    </form>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function OnboardingPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const autoSaveTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastSavedRef = useRef<string>('')

  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [isValidating, setIsValidating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [networkError, setNetworkError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successState, setSuccessState] = useState(false)
  const [data, setData] = useState<AgentFormData>({
    ahaCompleted: false,
    ahaResponseTimeMs: null,
    ahaSkipped: false,
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    state: '',
    calcomLink: '',
    smsPhoneNumber: '',
    termsAccepted: false,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmContent: null,
    utmTerm: null,
  })

  // Read UTM on mount
  useEffect(() => {
    const utm = readUtmParams(searchParams)
    if (Object.values(utm).some(Boolean)) {
      setData((prev) => ({ ...prev, ...utm }))
    }
  }, [searchParams])

  // Listen for email blur check
  useEffect(() => {
    const handleCheckEmail = async (e: Event) => {
      const email = (e as CustomEvent<string>).detail
      setIsValidating(true)
      setEmailError(null)
      try {
        const res = await fetch('/api/agents/check-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })
        if (!res.ok) throw new Error('Server error')
        const json = await res.json()
        if (!json.available) {
          setEmailError('Email is already taken — try another or sign in')
        }
      } catch (err: any) {
        if (err.message?.includes('Failed to fetch') || err.name === 'TypeError') {
          setNetworkError('No connection — check your internet and try again')
        }
      } finally {
        setIsValidating(false)
      }
    }
    window.addEventListener('onboarding:check-email', handleCheckEmail)
    return () => window.removeEventListener('onboarding:check-email', handleCheckEmail)
  }, [])

  // Auto-save every 2 seconds
  useEffect(() => {
    autoSaveTimer.current = setInterval(async () => {
      const serialized = JSON.stringify({ email: data.email, firstName: data.firstName, state: data.state })
      if (serialized === lastSavedRef.current) return
      lastSavedRef.current = serialized
      try {
        await fetch('/api/onboarding/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: data.email, firstName: data.firstName, lastName: data.lastName, state: data.state, step: currentStepIndex }),
        })
      } catch { /* silently ignore auto-save failures */ }
    }, 2000)
    return () => {
      if (autoSaveTimer.current) clearInterval(autoSaveTimer.current)
    }
  }, [data, currentStepIndex])

  const onChange = (partial: Partial<AgentFormData>) => {
    setData((prev) => ({ ...prev, ...partial }))
    setNetworkError(null)
    setSubmitError(null)
  }

  const goNext = () => {
    setCompletedSteps((prev) => new Set([...prev, currentStepIndex]))
    setCurrentStepIndex((i) => Math.min(i + 1, STEPS.length - 1))
  }

  const goBack = () => {
    setCurrentStepIndex((i) => Math.max(i - 1, 0))
  }

  const handleAccountNext = async () => {
    // Additional async email check before proceeding (if not already done via blur)
    if (emailError) return
    setIsValidating(true)
    try {
      const res = await fetch('/api/agents/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      })
      if (!res.ok) {
        if (res.status >= 500) {
          setNetworkError('Server error — please try again')
          return
        }
      } else {
        const json = await res.json()
        if (!json.available) {
          setEmailError('Email is already taken — try another or sign in')
          return
        }
      }
    } catch (err: any) {
      if (!navigator.onLine || err.message?.includes('Failed to fetch')) {
        setNetworkError('No connection — check your internet and try again')
        return
      }
      // Non-network errors: allow proceeding
    } finally {
      setIsValidating(false)
    }
    goNext()
  }

  const handleComplete = async () => {
    setIsSubmitting(true)
    setSubmitError(null)
    setNetworkError(null)
    try {
      if (!navigator.onLine) {
        setNetworkError('No connection — check your internet and try again')
        return
      }
      const res = await fetch('/api/agents/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        ...data,
        aha_moment_completed: data.ahaCompleted,
      }),
      })
      if (res.status === 409) {
        setSubmitError('An account with this email already exists. Please sign in instead.')
        return
      }
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || `Server error (${res.status})`)
      }
      setSuccessState(true)
      setCompletedSteps((prev) => new Set([...prev, currentStepIndex]))
      setTimeout(() => router.push('/dashboard'), 2000)
    } catch (err: any) {
      if (!navigator.onLine || err.message?.includes('Failed to fetch')) {
        setNetworkError('No connection — check your internet and try again')
      } else {
        setSubmitError(err.message || 'Failed to create account. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const steps: OnboardingStep[] = ['welcome', 'agent-info', 'calendar', 'sms', 'simulator', 'confirmation']
  const currentStep = STEPS[currentStepIndex]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/50">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
                <span className="text-emerald-400 font-bold text-sm">▶</span>
              </div>
              <h1 className="text-lg font-semibold text-white">LeadFlow AI</h1>
            </div>
            <div className="text-sm text-slate-400">
              Step {currentStepIndex + 1} of {STEPS.length}
            </div>
          </div>
        </header>

        {/* Step Indicator */}
        <div className="border-b border-slate-700/50 bg-slate-900/30">
          <div className="max-w-2xl mx-auto">
            <StepIndicator currentIndex={currentStepIndex} completedSteps={completedSteps} />
            <ProgressBar currentIndex={currentStepIndex} total={STEPS.length} />
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 flex items-start justify-center px-4 py-8">
          <div className="w-full max-w-2xl">
            <div className="wizard bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-6 md:p-10">
              {currentStep.id === 'account' && (
                <StepAccount
                  data={data}
                  onChange={onChange}
                  onNext={handleAccountNext}
                  isValidating={isValidating}
                  networkError={networkError}
                  emailError={emailError}
                />
              )}
              {currentStep.id === 'profile' && (
                <StepProfile
                  data={data}
                  onChange={onChange}
                  onNext={goNext}
                  onBack={goBack}
                  networkError={networkError}
                />
              )}
              {currentStep.id === 'integrations' && (
                <StepIntegrations
                  data={data}
                  onChange={onChange}
                  onNext={goNext}
                  onBack={goBack}
                  networkError={networkError}
                />
              )}
              {currentStep.id === 'simulator' && (
                <OnboardingSimulator
                  onNext={goNext}
                  onBack={goBack}
                  agentData={data}
                  setAgentData={setData}
                />
              )}
              {/* currentStep === 'simulator' */}
              {currentStep.id === 'confirm' && (
                <StepConfirm
                  data={data}
                  onChange={onChange}
                  onComplete={handleComplete}
                  onBack={goBack}
                  isSubmitting={isSubmitting}
                  submitError={submitError}
                  networkError={networkError}
                  successState={successState}
                />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingPageInner />
    </Suspense>
  )
}
