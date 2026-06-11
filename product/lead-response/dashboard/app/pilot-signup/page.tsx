'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUtmCapture, getUtmParams } from '@/lib/utm-capture'

/**
 * /pilot-signup — Pilot Signup Page
 *
 * Posts to /api/auth/pilot-signup so credentials are written to
 * real_estate_agents — the same table /api/auth/login reads from.
 * Collects: Name, Email, Password, Phone, License #, Brokerage, Market, Source
 */

const SOURCE_OPTIONS = [
  { value: '', label: 'How did you hear about us?' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'reddit', label: 'Reddit' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'google', label: 'Google' },
  { value: 'other', label: 'Other' },
]

export default function PilotSignupPage() {
  useUtmCapture()
  const router = useRouter()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    license_number: '',
    brokerage_name: '',
    market: '',
    source: '',
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.name.trim() || !formData.email.trim()) {
      setError('Name and email are required')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address')
      return
    }

    if (!formData.password || formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    try {
      // Read UTM params captured on first-touch landing (may be null if direct visit)
      const utmParams = getUtmParams()

      // Post to /api/auth/pilot-signup — writes to real_estate_agents (same table login reads)
      const response = await fetch('/api/auth/pilot-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          brokerage_name: formData.brokerage_name || undefined,
          source: formData.source || 'landing_page',
          ...(utmParams ?? {}),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 409) {
          setError('An account with this email already exists. Sign in instead.')
        } else {
          setError(data.error || 'Something went wrong. Please try again.')
        }
        setLoading(false)
        return
      }

      // Store user for client-side personalization (auth cookie set server-side)
      if (data.user) {
        try {
          localStorage.setItem('leadflow_user', JSON.stringify(data.user))
        } catch {
          // localStorage unavailable (private browsing) — non-fatal
        }
      }

      // Redirect to onboarding — account is ready for immediate login
      router.push(data.redirectTo || '/dashboard/onboarding')
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
              <span className="text-emerald-400 font-bold text-sm">▶</span>
            </div>
            <span className="text-white font-bold">LeadFlow AI</span>
          </Link>
          <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors">
            Already a member? Log in →
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-16">
        {submitted ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">You&apos;re in!</h1>
            <p className="text-slate-300 mb-6">
              Thanks for joining the LeadFlow AI free pilot. We&apos;ll reach out within 24 hours to
              schedule a quick 15-minute setup call and get you responding to leads in seconds.
            </p>
            <p className="text-slate-400 text-sm mb-8">
              Questions? Email{' '}
              <a href="mailto:support@leadflow.ai" className="text-emerald-400 hover:underline">
                support@leadflow.ai
              </a>
            </p>
            <Link href="/" className="text-sm text-slate-400 hover:text-white transition-colors">
              ← Back to home
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
                🎯 Free 30-Day Pilot — No credit card required
              </div>
              <h1 className="text-4xl font-bold text-white mb-4">
                Respond to Leads in &lt;30 Seconds
              </h1>
              <p className="text-slate-300 max-w-lg mx-auto">
                Join our free 30-day pilot. Real estate agents are responding to every lead.
                Should be you.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" /> Free for 30 days
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" /> Works with Follow Up Boss
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" /> Setup in 15 minutes
                </span>
              </div>
            </div>

            <Card className="border-slate-700 bg-slate-800/70">
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <Label htmlFor="name" className="text-slate-300 mb-1.5 block text-sm">
                        Full Name <span className="text-emerald-400">*</span>
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        data-testid="pilot-signup-name-input"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Jane Smith"
                        className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
                        required
                        disabled={loading}
                        autoFocus
                      />
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-slate-300 mb-1.5 block text-sm">
                        Email <span className="text-emerald-400">*</span>
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        data-testid="pilot-signup-email-input"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="jane@brokerage.com"
                        className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="password" className="text-slate-300 mb-1.5 block text-sm">
                      Password <span className="text-emerald-400">*</span>
                    </Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      data-testid="pilot-signup-password-input"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="At least 8 characters"
                      className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
                      required
                      disabled={loading}
                      autoComplete="new-password"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-slate-300 mb-1.5 block text-sm">
                      Phone Number <span className="text-slate-500 font-normal">(required for SMS setup)</span>
                    </Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      data-testid="pilot-signup-phone-input"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+1 (555) 123-4567"
                      className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
                      disabled={loading}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <Label htmlFor="brokerage_name" className="text-slate-300 mb-1.5 block text-sm">
                        Brokerage <span className="text-slate-500 font-normal">(optional)</span>
                      </Label>
                      <Input
                        id="brokerage_name"
                        name="brokerage_name"
                        type="text"
                        data-testid="pilot-signup-brokerage-input"
                        value={formData.brokerage_name}
                        onChange={handleChange}
                        placeholder="RE/MAX, Keller Williams…"
                        className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <Label htmlFor="market" className="text-slate-300 mb-1.5 block text-sm">
                        Market(s) Served <span className="text-slate-500 font-normal">(optional)</span>
                      </Label>
                      <Input
                        id="market"
                        name="market"
                        type="text"
                        data-testid="pilot-signup-market-input"
                        value={formData.market}
                        onChange={handleChange}
                        placeholder="Los Angeles, CA"
                        className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <Label htmlFor="license_number" className="text-slate-300 mb-1.5 block text-sm">
                        Real Estate License # <span className="text-slate-500 font-normal">(optional)</span>
                      </Label>
                      <Input
                        id="license_number"
                        name="license_number"
                        type="text"
                        data-testid="pilot-signup-license-input"
                        value={formData.license_number}
                        onChange={handleChange}
                        placeholder="CA-DRE-01234567"
                        className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <Label htmlFor="source" className="text-slate-300 mb-1.5 block text-sm">
                        How did you hear about us?
                      </Label>
                      <select
                        id="source"
                        name="source"
                        data-testid="pilot-signup-source-select"
                        value={formData.source}
                        onChange={handleChange}
                        className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-white text-sm focus:border-emerald-500 focus:outline-none"
                        disabled={loading}
                      >
                        {SOURCE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {error && (
                    <div role="alert" className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading}
                    data-testid="pilot-signup-submit-button"
                    className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold py-3 text-base rounded-xl"
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Joining pilot…</>
                    ) : (
                      <>Join Free Pilot <ArrowRight className="w-4 h-4 ml-2" /></>
                    )}
                  </Button>

                  <p className="text-xs text-slate-500 text-center">
                    Free for 30 days. No credit card. Cancel anytime.
                  </p>
                </form>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}
