'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { trackCTAClick, trackFormEvent } from '@/lib/analytics/ga4'
import { useUtmCapture } from '@/lib/utm-capture'

/**
 * /pilot — Pilot Application Form (FR-6: Backward Compatibility)
 *
 * This is the full pilot application form for real estate teams and brokerages
 * who want to apply for the structured pilot program (with manual follow-up).
 *
 * The frictionless "Start Free Trial" path is at /signup?mode=trial
 * source is set to 'pilot_application' for attribution (FR-6)
 */

const CRM_OPTIONS = [
  { value: '', label: 'Select your CRM…' },
  { value: 'follow_up_boss', label: 'Follow Up Boss' },
  { value: 'liondesk', label: 'LionDesk' },
  { value: 'kvcore', label: 'kvCORE' },
  { value: 'other', label: 'Other' },
  { value: 'none', label: 'None / Spreadsheet' },
]

const LEAD_VOLUME_OPTIONS = [
  { value: '', label: 'Monthly lead volume…' },
  { value: '1-10', label: '1–10 leads/month' },
  { value: '11-50', label: '11–50 leads/month' },
  { value: '51-100', label: '51–100 leads/month' },
  { value: '100+', label: '100+ leads/month' },
]

export default function PilotPage() {
  // Capture UTM parameters on mount (first-touch wins)
  useUtmCapture()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    brokerage_name: '',
    team_name: '',
    monthly_leads: '',
    current_crm: '',
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const formStartedRef = useRef(false)
  const formRef = useRef<HTMLDivElement>(null)

  // FR-4: Track form_view when the form section enters the viewport
  useEffect(() => {
    const el = formRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          trackFormEvent('form_view')
          observer.disconnect()
        }
      },
      { threshold: 0.3 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setError(null)
  }

  // FR-4: Track form_start on first field interaction
  const handleFirstInteraction = () => {
    if (!formStartedRef.current) {
      formStartedRef.current = true
      trackFormEvent('form_start')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // FR-2: Track CTA click for pilot program submission
    trackCTAClick('join_pilot_hero', 'Apply for Pilot Program', 'hero')

    // FR-4: Track submit attempt
    trackFormEvent('form_submit_attempt')

    if (!formData.name.trim() || !formData.email.trim()) {
      setError('Name and email are required')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/pilot-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          source: 'pilot_application',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // FR-4: Track submission error (no PII in params)
        trackFormEvent('form_submit_error', 'pilot_signup', {
          error_type: response.status === 409 ? 'duplicate_email' : 'api_error',
          http_status: response.status,
        })
        if (response.status === 409) {
          setError('This email has already been registered for the pilot program.')
        } else {
          setError(data.error || 'Something went wrong. Please try again.')
        }
        setLoading(false)
        return
      }

      // FR-4: Track conversion (marked as conversion in GA4 admin)
      trackFormEvent('pilot_signup_complete', 'pilot_signup', {
        crm: formData.current_crm || 'not_specified',
        lead_volume: formData.monthly_leads || 'not_specified',
      })
      setSubmitted(true)
    } catch {
      trackFormEvent('form_submit_error', 'pilot_signup', { error_type: 'network_error' })
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
          <Link href="/signup?mode=trial" className="text-sm text-emerald-400 hover:underline">
            Want instant access? Start free trial →
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-16">
        {submitted ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Application received!</h1>
            <p className="text-slate-300 mb-6">
              Thanks for applying to the LeadFlow AI pilot program. We&apos;ll review your application
              and reach out within 24 hours.
            </p>
            <p className="text-slate-400 text-sm mb-8">
              Want to start using LeadFlow AI right now?{' '}
              <Link href="/signup?mode=trial" className="text-emerald-400 hover:underline font-medium">
                Start your free 14-day trial — no credit card needed
              </Link>
            </p>
            <Link
              href="/"
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              ← Back to home
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
                🚀 Pilot Program — Limited spots
              </div>
              <h1 className="text-4xl font-bold text-white mb-4">Apply for the Pilot Program</h1>
              <p className="text-slate-300 max-w-lg mx-auto">
                We&apos;re onboarding our first real estate teams for early access. Apply below and we&apos;ll
                be in touch within 24 hours.
              </p>
              <p className="mt-4 text-sm text-slate-400">
                Solo agent?{' '}
                <Link href="/signup?mode=trial" className="text-emerald-400 hover:underline font-medium">
                  Skip the form — start your free trial instantly →
                </Link>
              </p>
            </div>

            {/* ref used by IntersectionObserver to fire form_view (FR-4) */}
            <div ref={formRef}>
            <Card className="border-slate-700 bg-slate-800/70">
              <CardContent className="p-8">
                {/* onFocus fires form_start on first interaction (FR-4) */}
                <form onSubmit={handleSubmit} onFocus={handleFirstInteraction} className="space-y-5" noValidate>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <Label htmlFor="name" className="text-slate-300 mb-1.5 block text-sm">
                        Full Name <span className="text-emerald-400">*</span>
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="John Smith"
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
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="you@example.com"
                        className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-slate-300 mb-1.5 block text-sm">
                      Phone Number <span className="text-slate-500 font-normal">(optional)</span>
                    </Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
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
                        value={formData.brokerage_name}
                        onChange={handleChange}
                        placeholder="RE/MAX, Keller Williams…"
                        className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <Label htmlFor="team_name" className="text-slate-300 mb-1.5 block text-sm">
                        Team Name <span className="text-slate-500 font-normal">(optional)</span>
                      </Label>
                      <Input
                        id="team_name"
                        name="team_name"
                        type="text"
                        value={formData.team_name}
                        onChange={handleChange}
                        placeholder="The Smith Team"
                        className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <Label htmlFor="monthly_leads" className="text-slate-300 mb-1.5 block text-sm">
                        Monthly Lead Volume
                      </Label>
                      <select
                        id="monthly_leads"
                        name="monthly_leads"
                        value={formData.monthly_leads}
                        onChange={handleChange}
                        className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-white text-sm focus:border-emerald-500 focus:outline-none"
                        disabled={loading}
                      >
                        {LEAD_VOLUME_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="current_crm" className="text-slate-300 mb-1.5 block text-sm">
                        Current CRM
                      </Label>
                      <select
                        id="current_crm"
                        name="current_crm"
                        value={formData.current_crm}
                        onChange={handleChange}
                        className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-white text-sm focus:border-emerald-500 focus:outline-none"
                        disabled={loading}
                      >
                        {CRM_OPTIONS.map((opt) => (
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
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-semibold py-3 text-base rounded-xl"
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting…</>
                    ) : (
                      <>Apply for Pilot Program <ArrowRight className="w-4 h-4 ml-2" /></>
                    )}
                  </Button>

                  <p className="text-xs text-slate-500 text-center">
                    We&apos;ll review your application and follow up within 24 hours.
                  </p>
                </form>
              </CardContent>
            </Card>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
