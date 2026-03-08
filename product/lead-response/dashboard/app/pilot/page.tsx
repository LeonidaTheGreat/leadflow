'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Pilot Application Form — backward-compatible with the original pilot recruitment form.
 * source = 'pilot_application' (FR-6)
 */
export default function PilotPage() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    brokerage_name: '',
    team_name: '',
    monthly_leads: '',
    current_crm: '',
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    if (error) setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.email) {
      setError('Name and email are required')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/pilot-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, source: 'pilot_application' }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        return
      }
      setSuccess(true)
    } catch (_err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
              <span className="text-emerald-400 font-bold text-sm">▶</span>
            </div>
            <span className="text-lg font-semibold text-white">LeadFlow AI</span>
          </Link>
          <Link
            href="/signup?mode=trial"
            className="text-sm text-emerald-400 hover:text-emerald-300 font-medium"
          >
            Start Free Trial instead →
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-16">
        {/* Pilot badge */}
        <div className="flex justify-center mb-6">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm font-medium">
            🚀 Pilot Program Application
          </span>
        </div>

        <h1 className="text-3xl font-bold text-white text-center mb-3">
          Apply for the Pilot Program
        </h1>
        <p className="text-slate-400 text-center mb-2">
          Work directly with us to shape the product. Limited spots available.
        </p>
        <p className="text-center mb-8">
          <Link
            href="/signup?mode=trial"
            className="text-emerald-400 hover:text-emerald-300 text-sm underline underline-offset-2"
          >
            Want instant access? Start your free 30-day trial instead →
          </Link>
        </p>

        {success ? (
          <Card className="border-emerald-500/40 bg-emerald-950/20">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Application Received!</h2>
              <p className="text-slate-400 mb-6">
                Thank you! We'll review your application and reach out within 24–48 hours.
              </p>
              <p className="text-slate-400 text-sm mb-4">
                Want to start immediately?
              </p>
              <Link
                href="/signup?mode=trial"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all"
              >
                Start your free 30-day trial <ArrowRight className="w-4 h-4" />
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-700/50 bg-slate-900/50">
            <CardHeader>
              <CardTitle className="text-white text-xl">Tell us about yourself</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name */}
                <div>
                  <Label htmlFor="name" className="text-slate-300 mb-1.5 block text-sm">
                    Full name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Jane Smith"
                    className="bg-slate-800/80 border-slate-600 text-white placeholder:text-slate-500"
                    required
                    disabled={loading}
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
                    onChange={handleChange}
                    placeholder="jane@brokerage.com"
                    className="bg-slate-800/80 border-slate-600 text-white placeholder:text-slate-500"
                    required
                    disabled={loading}
                  />
                </div>

                {/* Phone */}
                <div>
                  <Label htmlFor="phone" className="text-slate-300 mb-1.5 block text-sm">
                    Phone number
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+1 (416) 555-0100"
                    className="bg-slate-800/80 border-slate-600 text-white placeholder:text-slate-500"
                    disabled={loading}
                  />
                </div>

                {/* Brokerage */}
                <div>
                  <Label htmlFor="brokerage_name" className="text-slate-300 mb-1.5 block text-sm">
                    Brokerage name
                  </Label>
                  <Input
                    id="brokerage_name"
                    name="brokerage_name"
                    type="text"
                    value={formData.brokerage_name}
                    onChange={handleChange}
                    placeholder="RE/MAX, Royal LePage, etc."
                    className="bg-slate-800/80 border-slate-600 text-white placeholder:text-slate-500"
                    disabled={loading}
                  />
                </div>

                {/* Monthly Leads */}
                <div>
                  <Label htmlFor="monthly_leads" className="text-slate-300 mb-1.5 block text-sm">
                    Monthly leads volume
                  </Label>
                  <select
                    id="monthly_leads"
                    name="monthly_leads"
                    value={formData.monthly_leads}
                    onChange={handleChange}
                    disabled={loading}
                    className="w-full rounded-md border border-slate-600 bg-slate-800/80 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                  >
                    <option value="">Select range…</option>
                    <option value="1-10">1–10 leads/month</option>
                    <option value="11-50">11–50 leads/month</option>
                    <option value="51-100">51–100 leads/month</option>
                    <option value="100+">100+ leads/month</option>
                  </select>
                </div>

                {/* Current CRM */}
                <div>
                  <Label htmlFor="current_crm" className="text-slate-300 mb-1.5 block text-sm">
                    Current CRM
                  </Label>
                  <select
                    id="current_crm"
                    name="current_crm"
                    value={formData.current_crm}
                    onChange={handleChange}
                    disabled={loading}
                    className="w-full rounded-md border border-slate-600 bg-slate-800/80 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                  >
                    <option value="">Select CRM…</option>
                    <option value="follow_up_boss">Follow Up Boss</option>
                    <option value="liondesk">LionDesk</option>
                    <option value="kvcore">kvCORE</option>
                    <option value="other">Other</option>
                    <option value="none">No CRM yet</option>
                  </select>
                </div>

                {/* Error */}
                {error && (
                  <div
                    role="alert"
                    className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm"
                  >
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting…</>
                  ) : (
                    <>Apply for Pilot Program <ArrowRight className="w-4 h-4 ml-2" /></>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
