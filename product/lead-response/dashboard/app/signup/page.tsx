'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Check, Loader2, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Pricing tiers for plan-select mode
const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 49,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTHLY || 'price_starter_49',
    features: [
      'Up to 50 leads/month',
      'AI SMS responses',
      'Basic qualification',
      'Calendar integration',
      'Email support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 149,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY || 'price_pro_149',
    popular: true,
    features: [
      'Up to 200 leads/month',
      'AI SMS & email',
      'Advanced qualification',
      'Calendar integration',
      'Priority support',
      'Advanced analytics',
    ],
  },
  {
    id: 'team',
    name: 'Team',
    price: 399,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_TEAM_MONTHLY || 'price_team_399',
    features: [
      'Up to 500 leads/month',
      'Multi-channel AI',
      'Custom workflows',
      'Team management',
      'Dedicated support',
      'White-label options',
    ],
  },
]

// --- Trial Signup Form ---
function TrialSignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    if (error) setError(null)
  }

  const validate = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!formData.email) { setError('Email is required'); return false }
    if (!emailRegex.test(formData.email)) { setError('Please enter a valid email address'); return false }
    if (!formData.password) { setError('Password is required'); return false }
    if (formData.password.length < 8) { setError('Password must be at least 8 characters'); return false }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/trial-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name || undefined,
          utm_source: searchParams.get('utm_source'),
          utm_medium: searchParams.get('utm_medium'),
          utm_campaign: searchParams.get('utm_campaign'),
          utm_content: searchParams.get('utm_content'),
          utm_term: searchParams.get('utm_term'),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 409) {
          setError('An account with this email already exists. Sign in instead.')
        } else {
          setError(data.error || 'Something went wrong. Please try again.')
        }
        return
      }

      // Success — redirect to dashboard/onboarding
      router.push(data.redirectTo || '/dashboard/onboarding')
    } catch (_err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Decorative blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
              <span className="text-emerald-400 font-bold text-sm">▶</span>
            </div>
            <span className="text-lg font-semibold text-white">LeadFlow AI</span>
          </Link>
          <p className="text-sm text-slate-400">
            Already have an account?{' '}
            <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          {/* Badge */}
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              30-Day Free Trial
            </span>
          </div>

          <h1 className="text-3xl font-bold text-white text-center mb-2">
            Create Your Free Account
          </h1>
          <p className="text-slate-400 text-center mb-8">
            Full Pro access for 30 days. No credit card required.
          </p>

          <Card className="border-slate-700 bg-slate-800/50 backdrop-blur-sm">
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name (optional) */}
                <div>
                  <Label htmlFor="name" className="text-slate-300 mb-1.5 block text-sm">
                    Your name <span className="text-slate-500">(optional)</span>
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Your name"
                    className="bg-slate-900/80 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500"
                    disabled={loading}
                    autoComplete="name"
                  />
                </div>

                {/* Email */}
                <div>
                  <Label htmlFor="email" className="text-slate-300 mb-1.5 block text-sm">
                    Email address <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="you@example.com"
                    className="bg-slate-900/80 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500"
                    required
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>

                {/* Password */}
                <div>
                  <Label htmlFor="password" className="text-slate-300 mb-1.5 block text-sm">
                    Password <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Min. 8 characters"
                    className="bg-slate-900/80 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500"
                    required
                    disabled={loading}
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>

                {/* Error */}
                {error && (
                  <div
                    role="alert"
                    className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm"
                  >
                    {error}
                    {error.includes('Sign in instead') && (
                      <>
                        {' '}
                        <Link href="/login" className="underline font-medium">
                          Sign in
                        </Link>
                      </>
                    )}
                  </div>
                )}

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold py-3 text-base"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating your account…
                    </>
                  ) : (
                    <>
                      Create My Free Account
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>

                {/* Trust signals */}
                <div className="flex items-center justify-center gap-1.5 text-slate-400 text-xs pt-1">
                  <Shield className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Free for 30 days · No credit card · Cancel anytime</span>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* What you get */}
          <div className="mt-8 space-y-2">
            {[
              'Full Pro features for 30 days',
              'AI-powered lead responses in under 30 seconds',
              'FUB + Cal.com integration included',
              'No credit card, no contracts',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-slate-400 text-sm">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="underline hover:text-slate-400">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline hover:text-slate-400">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  )
}

// --- Standard (Plan-Select) Signup ---
function PlanSignupForm() {
  const router = useRouter()
  const [step, setStep] = useState<'select-plan' | 'enter-details'>('select-plan')
  const [selectedPlan, setSelectedPlan] = useState<(typeof PLANS)[0] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone: '',
    password: '',
  })

  const handlePlanSelect = (plan: (typeof PLANS)[0]) => {
    setSelectedPlan(plan)
    setStep('enter-details')
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const validateForm = () => {
    if (!formData.email || !formData.name || !formData.phone || !formData.password) {
      setError('All fields are required')
      return false
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) { setError('Please enter a valid email address'); return false }
    const phoneRegex = /^\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/
    if (!phoneRegex.test(formData.phone)) { setError('Please enter a valid phone number'); return false }
    if (formData.password.length < 8) { setError('Password must be at least 8 characters'); return false }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    if (!selectedPlan) return
    setLoading(true)
    setError(null)
    try {
      const agentResponse = await fetch('/api/agents/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
          phone: formData.phone,
          password: formData.password,
        }),
      })
      if (!agentResponse.ok) {
        const errorData = await agentResponse.json()
        throw new Error(errorData.error || 'Failed to create account')
      }
      const { agentId } = await agentResponse.json()
      const checkoutResponse = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          email: formData.email,
          plan: selectedPlan.id,
          priceId: selectedPlan.priceId,
        }),
      })
      if (!checkoutResponse.ok) {
        const errorData = await checkoutResponse.json()
        throw new Error(errorData.error || 'Failed to create checkout session')
      }
      const { url } = await checkoutResponse.json()
      if (url) { window.location.href = url } else { throw new Error('No checkout URL received') }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setError(msg)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        <header className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/50">
          <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
                <span className="text-emerald-400 font-bold text-sm">▶</span>
              </div>
              <span className="text-lg font-semibold text-white">LeadFlow AI</span>
            </Link>
            <p className="text-sm text-slate-400">
              Already have an account?{' '}
              <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium">Sign in</Link>
            </p>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-16">
          {/* Progress */}
          <div className="mb-10 flex items-center justify-center gap-4">
            {['Select Plan', 'Your Details', 'Payment'].map((label, i) => {
              const stepIndex = i + 1
              const currentStep = step === 'select-plan' ? 1 : 2
              const done = currentStep > stepIndex
              const active = currentStep === stepIndex
              return (
                <div key={label} className="flex items-center gap-2">
                  {i > 0 && <div className="w-12 h-px bg-slate-600" />}
                  <div className={`flex items-center gap-2 ${active ? 'text-emerald-400' : 'text-slate-500'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                      done ? 'bg-emerald-500/20 text-emerald-400' : active ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'
                    }`}>
                      {done ? '✓' : stepIndex}
                    </div>
                    <span className="hidden sm:inline text-sm">{label}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Trial shortcut banner */}
          <div className="mb-8 text-center">
            <p className="text-slate-400 text-sm">
              Want to try first?{' '}
              <Link href="/signup?mode=trial" className="text-emerald-400 hover:text-emerald-300 font-medium underline underline-offset-2">
                Start your free 30-day trial →
              </Link>
            </p>
          </div>

          {/* Step 1: Plan Selection */}
          {step === 'select-plan' && (
            <div>
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-white mb-4">Choose Your Plan</h2>
                <p className="text-xl text-slate-300">Start with a 14-day free trial. Cancel anytime.</p>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                {PLANS.map((plan) => (
                  <Card
                    key={plan.id}
                    className={`relative border-2 transition-all cursor-pointer ${
                      plan.popular
                        ? 'border-emerald-500 bg-gradient-to-br from-slate-800 to-slate-900 ring-2 ring-emerald-500/20'
                        : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
                    }`}
                  >
                    <CardContent className="p-6">
                      {plan.popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                            MOST POPULAR
                          </span>
                        </div>
                      )}
                      <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                      <div className="flex items-baseline gap-1 mb-6">
                        <span className="text-4xl font-bold text-white">${plan.price}</span>
                        <span className="text-slate-400">/month</span>
                      </div>
                      <ul className="space-y-3 mb-6">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                            <span className="text-slate-300 text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        onClick={() => handlePlanSelect(plan)}
                        className={`w-full ${
                          plan.popular
                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700'
                            : 'bg-slate-700 hover:bg-slate-600'
                        }`}
                      >
                        Get Started <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Enter Details */}
          {step === 'enter-details' && selectedPlan && (
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-4xl font-bold text-white mb-2">Create Your Account</h2>
                <p className="text-slate-300">
                  Selected plan:{' '}
                  <span className="text-emerald-400 font-semibold">
                    {selectedPlan.name}
                  </span>{' '}
                  (${selectedPlan.price}/month)
                </p>
              </div>
              <Card className="border-slate-700 bg-slate-800/50">
                <CardContent className="p-8">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {[
                      { id: 'email', label: 'Email Address', type: 'email', placeholder: 'you@example.com' },
                      { id: 'name', label: 'Full Name', type: 'text', placeholder: 'John Smith' },
                      { id: 'phone', label: 'Phone Number', type: 'tel', placeholder: '+1 (555) 123-4567' },
                      { id: 'password', label: 'Password', type: 'password', placeholder: 'Create a strong password (min 8 characters)' },
                    ].map(({ id, label, type, placeholder }) => (
                      <div key={id}>
                        <Label htmlFor={id} className="text-white mb-2 block">{label} *</Label>
                        <Input
                          id={id}
                          name={id}
                          type={type}
                          value={formData[id as keyof typeof formData]}
                          onChange={handleInputChange}
                          placeholder={placeholder}
                          className="bg-slate-900 border-slate-600 text-white"
                          required
                          disabled={loading}
                          minLength={id === 'password' ? 8 : undefined}
                        />
                      </div>
                    ))}
                    {error && (
                      <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                        {error}
                      </div>
                    )}
                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setStep('select-plan')}
                        disabled={loading}
                        className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        Back
                      </Button>
                      <Button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
                      >
                        {loading ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing…</>
                        ) : (
                          <>Continue to Payment <ArrowRight className="w-4 h-4 ml-2" /></>
                        )}
                      </Button>
                    </div>
                  </form>
                  <div className="mt-6 pt-6 border-t border-slate-700">
                    <p className="text-xs text-slate-400 text-center">
                      By continuing, you agree to our Terms of Service and Privacy Policy.
                      Your 14-day free trial starts today. No charge until{' '}
                      {new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

// --- Root with mode detection ---
function SignupContent() {
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode')

  if (mode === 'trial') {
    return <TrialSignupForm />
  }
  return <PlanSignupForm />
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    }>
      <SignupContent />
    </Suspense>
  )
}
