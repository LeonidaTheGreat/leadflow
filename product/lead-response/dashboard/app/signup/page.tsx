'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Suspense } from 'react'
import TrialSignupForm from '@/components/trial-signup-form'
import { trackFormEvent } from '@/lib/analytics/ga4'

// Pricing tiers as per UC-9 spec
// HARDCODED: No env var dependency to ensure plans always render.
// NOTE: priceId is NOT stored here — price IDs are server-side secrets loaded
// from env vars. The client sends a `tier` string; the server resolves it to
// a real Stripe price ID via STRIPE_PRICE_<TIER>_MONTHLY env vars.
interface Plan {
  id: string
  name: string
  price: number
  popular?: boolean
  features: string[]
}

// Maps plan.id → checkout API `tier` value (matches PRICE_ID_ENV_MAP in create-checkout/route.ts)
const PLAN_CHECKOUT_TIER: Record<string, string> = {
  starter: 'starter_monthly',
  pro:     'professional_monthly',
  team:    'enterprise_monthly',
}

const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 49,
    features: [
      'Up to 50 leads/month',
      'AI SMS responses',
      'Basic qualification',
      'Calendar integration',
      'Email support'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 149,
    popular: true,
    features: [
      'Up to 200 leads/month',
      'AI SMS & email',
      'Advanced qualification',
      'Calendar integration',
      'Priority support',
      'Advanced analytics'
    ]
  },
  {
    id: 'team',
    name: 'Team',
    price: 399,
    features: [
      'Up to 500 leads/month',
      'Multi-channel AI',
      'Custom workflows',
      'Team management',
      'Dedicated support',
      'White-label options'
    ]
  }
]

export default function SignupPage() {
  return <SignupPageInner />
}

function SignupPageInner() {
  const searchParams = useSearchParams()
  const isTrialMode = searchParams.get('mode') === 'trial'

  // If trial mode, render the frictionless trial form
  if (isTrialMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
        <header className="border-b border-slate-700/50">
          <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
            <a href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
                <span className="text-emerald-400 font-bold text-sm">▶</span>
              </div>
              <h1 className="text-lg font-semibold text-white">LeadFlow AI</h1>
            </a>
            <a href="/login" className="text-sm text-slate-400 hover:text-white">
              Already have an account? Sign in
            </a>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <TrialSignupForm />
        </main>
      </div>
    )
  }

  // Default: existing paid signup flow
  return <PaidSignupFlow />
}

function PaidSignupFlow() {
  const [step, setStep] = useState<'select-plan' | 'enter-details' | 'checkout'>('select-plan')
  const [selectedPlan, setSelectedPlan] = useState<typeof PLANS[0] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone: '',
    password: ''
  })

  // FR-3: Track form open on page mount
  useEffect(() => {
    trackFormEvent('form_view', 'pilot_signup')
  }, [])

  const handlePlanSelect = (plan: typeof PLANS[0]) => {
    setSelectedPlan(plan)
    setStep('enter-details')
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const validateForm = () => {
    if (!formData.email || !formData.name || !formData.phone || !formData.password) {
      setError('All fields are required')
      return false
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address')
      return false
    }

    // Basic phone validation (US format)
    const phoneRegex = /^\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/
    if (!phoneRegex.test(formData.phone)) {
      setError('Please enter a valid phone number')
      return false
    }

    // Password validation (min 8 chars)
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    if (!selectedPlan) return

    // FR-3: Track form submit (no PII)
    trackFormEvent('form_submit_attempt', 'pilot_signup', { plan: selectedPlan.id })

    setLoading(true)
    setError(null)

    try {
      // Step 1: Create agent record with password
      const agentResponse = await fetch('/api/agents/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
          phone: formData.phone,
          password: formData.password
        })
      })

      if (!agentResponse.ok) {
        const errorData = await agentResponse.json()
        throw new Error(errorData.error || 'Failed to create account')
      }

      const { agentId } = await agentResponse.json()

      // Step 2: Create Stripe checkout session
      // Send `tier` (not priceId) — the server resolves the Stripe price ID
      // from STRIPE_PRICE_<TIER>_MONTHLY env vars to keep secrets server-side.
      const checkoutTier = PLAN_CHECKOUT_TIER[selectedPlan.id]
      if (!checkoutTier) {
        throw new Error(`Unknown plan: ${selectedPlan.id}`)
      }
      const checkoutResponse = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: checkoutTier,
          agentId,
          email: formData.email,
        })
      })

      if (!checkoutResponse.ok) {
        const errorData = await checkoutResponse.json()
        throw new Error(errorData.error || 'Failed to create checkout session')
      }

      const { url } = await checkoutResponse.json()

      // Step 3: Redirect to Stripe Checkout
      if (url) {
        // FR-3: Track form success before redirecting
        trackFormEvent('pilot_signup_complete', 'pilot_signup', { plan: selectedPlan.id })
        window.location.href = url
      } else {
        throw new Error('No checkout URL received')
      }
    } catch (err: any) {
      console.error('Signup error:', err)
      // FR-3: Track form error (no PII)
      trackFormEvent('form_submit_error', 'pilot_signup')
      setError(err.message || 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/50">
          <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
            <a href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
                <span className="text-emerald-400 font-bold text-sm">▶</span>
              </div>
              <h1 className="text-lg font-semibold text-white">LeadFlow AI</h1>
            </a>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-5xl mx-auto px-4 py-16">
          {/* Progress indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-4">
              <div className={`flex items-center gap-2 ${step === 'select-plan' ? 'text-emerald-400' : 'text-slate-500'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step === 'select-plan' ? 'bg-emerald-500 text-white' : 
                  step === 'enter-details' || step === 'checkout' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700'
                }`}>
                  {step === 'enter-details' || step === 'checkout' ? '✓' : '1'}
                </div>
                <span className="hidden sm:inline">Select Plan</span>
              </div>
              <div className="w-12 h-px bg-slate-600"></div>
              <div className={`flex items-center gap-2 ${step === 'enter-details' ? 'text-emerald-400' : 'text-slate-500'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step === 'enter-details' ? 'bg-emerald-500 text-white' : 
                  step === 'checkout' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700'
                }`}>
                  {step === 'checkout' ? '✓' : '2'}
                </div>
                <span className="hidden sm:inline">Your Details</span>
              </div>
              <div className="w-12 h-px bg-slate-600"></div>
              <div className={`flex items-center gap-2 ${step === 'checkout' ? 'text-emerald-400' : 'text-slate-500'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step === 'checkout' ? 'bg-emerald-500 text-white' : 'bg-slate-700'
                }`}>
                  3
                </div>
                <span className="hidden sm:inline">Payment</span>
              </div>
            </div>
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
                  Selected plan: <span className="text-emerald-400 font-semibold">{selectedPlan.name}</span> (${selectedPlan.price}/month)
                </p>
              </div>

              <Card className="border-slate-700 bg-slate-800/50">
                <CardContent className="p-8">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <Label htmlFor="email" className="text-white mb-2 block">Email Address *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="you@example.com"
                        className="bg-slate-900 border-slate-600 text-white"
                        required
                        disabled={loading}
                      />
                    </div>

                    <div>
                      <Label htmlFor="name" className="text-white mb-2 block">Full Name *</Label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="John Smith"
                        className="bg-slate-900 border-slate-600 text-white"
                        required
                        disabled={loading}
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone" className="text-white mb-2 block">Phone Number *</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="+1 (555) 123-4567"
                        className="bg-slate-900 border-slate-600 text-white"
                        required
                        disabled={loading}
                      />
                    </div>

                    <div>
                      <Label htmlFor="password" className="text-white mb-2 block">Password *</Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder="Create a strong password (min 8 characters)"
                        className="bg-slate-900 border-slate-600 text-white"
                        required
                        disabled={loading}
                        minLength={8}
                      />
                    </div>

                    {error && (
                      <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
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
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            Continue to Payment <ArrowRight className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  </form>

                  <div className="mt-6 pt-6 border-t border-slate-700">
                    <p className="text-xs text-slate-400 text-center">
                      By continuing, you agree to our Terms of Service and Privacy Policy. 
                      Your 14-day free trial starts today. No charge until {new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}.
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
