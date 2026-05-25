'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, useCallback } from 'react'

function trackEvent(eventName: string, params?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && typeof (window as unknown as Record<string, unknown>).gtag === 'function') {
    ;(window as unknown as Record<string, (...a: unknown[]) => void>).gtag('event', eventName, params)
  }
}

function getUtmParams(): { utmSource: string | null; utmMedium: string | null; utmCampaign: string | null } {
  if (typeof window === 'undefined') return { utmSource: null, utmMedium: null, utmCampaign: null }
  const p = new URLSearchParams(window.location.search)
  return {
    utmSource: p.get('utm_source'),
    utmMedium: p.get('utm_medium'),
    utmCampaign: p.get('utm_campaign'),
  }
}

type FormState = 'idle' | 'loading' | 'success' | 'error'

const VALUE_BULLETS = [
  '3 word-for-word SMS templates to send the moment a lead arrives',
  'Why 78% of deals go to whoever responds first — and how to be that agent',
  'The fast qualification system that books more showings in fewer messages',
]

export default function LeadMagnetSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [formState, setFormState] = useState<FormState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const hasTrackedView = useRef(false)

  useEffect(() => {
    if (!sectionRef.current || hasTrackedView.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasTrackedView.current) {
          hasTrackedView.current = true
          trackEvent('lead_magnet_view')
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      trackEvent('lead_magnet_submit', { email_entered: !!email })

      if (!validateEmail(email)) {
        setErrorMsg('Please enter a valid email address.')
        setFormState('error')
        trackEvent('lead_magnet_error', { reason: 'invalid_email_client' })
        return
      }

      setFormState('loading')
      setErrorMsg('')

      try {
        const { utmSource, utmMedium, utmCampaign } = getUtmParams()
        const res = await fetch('/api/lead-capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            firstName: firstName.trim() || undefined,
            source: 'landing-page',
            utmSource,
            utmMedium,
            utmCampaign,
          }),
        })
        const data = await res.json()

        if (data.success) {
          setFormState('success')
          trackEvent('lead_magnet_success', { utm_source: utmSource })
        } else {
          setErrorMsg(data.error || 'Something went wrong. Please try again.')
          setFormState('error')
          trackEvent('lead_magnet_error', { reason: data.error })
        }
      } catch {
        setErrorMsg('Something went wrong. Please try again or email us at support@leadflow.ai.')
        setFormState('error')
        trackEvent('lead_magnet_error', { reason: 'network_error' })
      }
    },
    [email, firstName]
  )

  return (
    <section
      ref={sectionRef}
      data-testid="lead-magnet-section"
      aria-label="Lead magnet — get the free playbook"
      className="my-20 px-4"
    >
      <div className="max-w-2xl mx-auto bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl px-8 py-12 text-center">

        {/* Label */}
        <p className="text-xs font-semibold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase mb-4">
          Free Resource for Real Estate Agents
        </p>

        {/* Headline */}
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-3">
          Not ready to commit yet? That&apos;s okay.
        </h2>

        {/* Subheadline */}
        <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 mb-6 max-w-lg mx-auto">
          Get <strong className="text-slate-800 dark:text-slate-200">&ldquo;The 5-Minute AI Lead Response Playbook&rdquo;</strong> — free.
          How top agents respond faster and convert more leads, in plain English.
        </p>

        {/* Value bullets */}
        <ul className="text-left inline-block mb-8 space-y-2">
          {VALUE_BULLETS.map((bullet) => (
            <li key={bullet} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
              <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>

        {/* Success state */}
        {formState === 'success' ? (
          <div data-testid="lead-magnet-success" className="flex flex-col items-center gap-3">
            <div className="text-4xl">🎉</div>
            <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">
              Your playbook is on its way!
            </p>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Check your inbox — it should arrive in the next minute.
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              While you wait:{' '}
              <Link href="/demo" className="text-emerald-600 dark:text-emerald-400 font-medium underline underline-offset-2 hover:text-emerald-700">
                Try the live AI demo →
              </Link>
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            data-testid="lead-magnet-form"
            className="flex flex-col gap-3 max-w-md mx-auto"
          >
            {/* Inputs row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="First name (optional)"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                data-testid="lead-magnet-firstname"
                aria-label="First name (optional)"
                className="sm:w-40 px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <input
                type="email"
                required
                placeholder="your@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (formState === 'error') setFormState('idle')
                }}
                data-testid="lead-magnet-email"
                aria-label="Email address"
                aria-describedby={formState === 'error' ? 'lead-magnet-error' : undefined}
                className={`flex-1 px-4 py-3 rounded-lg border ${
                  formState === 'error'
                    ? 'border-red-400 focus:ring-red-400'
                    : 'border-slate-300 dark:border-slate-600 focus:ring-emerald-500'
                } bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2`}
              />
            </div>

            {/* CTA */}
            <button
              type="submit"
              disabled={formState === 'loading'}
              data-testid="lead-magnet-submit"
              className="w-full px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-semibold rounded-lg transition-colors"
            >
              {formState === 'loading' ? 'Sending…' : 'Send Me the Playbook →'}
            </button>

            {/* Inline error */}
            {formState === 'error' && errorMsg && (
              <p
                id="lead-magnet-error"
                data-testid="lead-magnet-error"
                role="alert"
                className="text-sm text-red-600 dark:text-red-400"
              >
                {errorMsg}
              </p>
            )}
          </form>
        )}

        {/* Trust line */}
        {formState !== 'success' && (
          <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
            No spam. Unsubscribe anytime. Your guide arrives in under 60 seconds.
          </p>
        )}
      </div>
    </section>
  )
}
