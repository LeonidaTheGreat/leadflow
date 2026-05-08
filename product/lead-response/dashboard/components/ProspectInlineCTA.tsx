'use client'

import { useState } from 'react'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getUtmParams(): { utmSource: string | null; utmMedium: string | null; utmCampaign: string | null } {
  if (typeof window === 'undefined') return { utmSource: null, utmMedium: null, utmCampaign: null }
  const p = new URLSearchParams(window.location.search)
  return { utmSource: p.get('utm_source'), utmMedium: p.get('utm_medium'), utmCampaign: p.get('utm_campaign') }
}

export default function ProspectInlineCTA() {
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!EMAIL_REGEX.test(email)) {
      setStatus('error')
      setErrorMsg('Please enter a valid email address.')
      return
    }
    setStatus('submitting')
    setErrorMsg('')

    const { utmSource, utmMedium, utmCampaign } = getUtmParams()

    try {
      const res = await fetch('/api/prospects/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, firstName: firstName || null, utmSource, utmMedium, utmCampaign, source: 'hero-inline' }),
      })
      const data = await res.json()
      if (data.success) {
        setStatus('success')
      } else {
        setStatus('error')
        setErrorMsg(data.error || 'Something went wrong. Please try again.')
      }
    } catch {
      setStatus('error')
      setErrorMsg('Connection error. Please try again.')
    }
  }

  if (status === 'success') {
    return (
      <div
        className="mt-8 py-4 px-6 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center"
        data-testid="inline-cta-success"
      >
        <p className="font-semibold text-emerald-700 dark:text-emerald-400">You&apos;re on the list! We&apos;ll be in touch.</p>
      </div>
    )
  }

  return (
    <div
      className="mt-8 bg-white/10 dark:bg-slate-800/50 rounded-xl border border-white/20 dark:border-slate-700 p-6"
      data-testid="inline-cta-section"
    >
      <p className="text-white font-semibold text-base mb-1">Not ready to sign up? Stay in the loop.</p>
      <p className="text-slate-300 text-sm mb-4">Drop your email and we&apos;ll send you practical tips on converting more leads — no commitment.</p>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2" data-testid="inline-cta-form">
        <input
          type="text"
          placeholder="First name"
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
          className="flex-none w-full sm:w-32 px-3 py-2 text-sm rounded-lg bg-white/20 dark:bg-slate-700 text-white placeholder-slate-300 border border-white/30 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          data-testid="inline-cta-firstname"
        />
        <input
          type="email"
          placeholder="Your email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="flex-1 px-3 py-2 text-sm rounded-lg bg-white/20 dark:bg-slate-700 text-white placeholder-slate-300 border border-white/30 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          data-testid="inline-cta-email"
        />
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-semibold text-sm rounded-lg transition-colors whitespace-nowrap"
          data-testid="inline-cta-submit"
        >
          {status === 'submitting' ? 'Saving…' : 'Keep Me Posted'}
        </button>
      </form>
      {status === 'error' && (
        <p className="mt-2 text-xs text-red-300" data-testid="inline-cta-error">{errorMsg}</p>
      )}
    </div>
  )
}
