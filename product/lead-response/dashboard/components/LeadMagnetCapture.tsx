'use client'

/**
 * LeadMagnetCapture — Email capture section for landing page
 *
 * UC: feat-lead-magnet-email-capture-landing-page
 * PRD: docs/prd/PRD-LEAD-MAGNET-EMAIL-CAPTURE.md
 * Design spec: docs/design/lead-magnet-email-capture-design.md
 *
 * Placement: between Testimonials and Pricing sections in app/page.tsx
 *
 * Fires GA4 analytics events:
 *   lead_magnet_view   — section enters viewport (IntersectionObserver, one-shot)
 *   lead_magnet_submit — on form submit attempt
 *   lead_magnet_success — on successful capture (200 response)
 *   lead_magnet_error  — on validation or API error
 *
 * API: POST /api/lead-capture
 *   Body: { email, firstName?, source, utmSource?, utmMedium?, utmCampaign? }
 *   Success response: { success: true }
 *   Error response:  { success: false, error: string }
 *
 * TODO (dev agent): wire up the /api/lead-capture endpoint per PRD §5.2
 *   - Validate email server-side
 *   - Upsert into pilot_signups (source='lead_magnet', status='nurture')
 *   - Send Email 1 via Resend immediately
 *   - Store UTM params
 *   - Return { success: true } for both new and duplicate emails
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'

// ---------------------------------------------------------------------------
// Analytics helpers
// ---------------------------------------------------------------------------

function gtag(...args: unknown[]) {
  if (
    typeof window !== 'undefined' &&
    typeof (window as unknown as Record<string, unknown>).gtag === 'function'
  ) {
    ;(window as unknown as Record<string, (...a: unknown[]) => void>).gtag(...args)
  }
}

function trackEvent(eventName: string, params?: Record<string, unknown>) {
  gtag('event', eventName, params)
}

// ---------------------------------------------------------------------------
// UTM helpers
// ---------------------------------------------------------------------------

function getUtmParams(): {
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
} {
  if (typeof window === 'undefined') {
    return { utmSource: null, utmMedium: null, utmCampaign: null }
  }
  const p = new URLSearchParams(window.location.search)
  return {
    utmSource: p.get('utm_source'),
    utmMedium: p.get('utm_medium'),
    utmCampaign: p.get('utm_campaign'),
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FormState = 'idle' | 'loading' | 'success' | 'error'

// ---------------------------------------------------------------------------
// Value bullets
// ---------------------------------------------------------------------------

const VALUE_BULLETS = [
  '3 word-for-word SMS templates to send the moment a lead arrives',
  'Why 78% of deals go to whoever responds first — and how to be that agent',
  'The fast qualification system that books more showings in fewer messages',
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LeadMagnetCapture() {
  const sectionRef = useRef<HTMLElement>(null)
  const hasTrackedView = useRef(false)

  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [formState, setFormState] = useState<FormState>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  // Track section view via IntersectionObserver (one-shot, 30% threshold)
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

  // Client-side email validation
  const validateEmail = (val: string): boolean =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()

      trackEvent('lead_magnet_submit', { email_entered: !!email })

      // Client-side validation — don't hit the API for obviously bad input
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

        // TODO (dev agent): confirm /api/lead-capture exists and handles:
        //   - server-side email validation
        //   - upsert into pilot_signups with source='lead_magnet', status='nurture'
        //   - Resend email delivery (Email 1 from content brief)
        //   - silent success for duplicate emails
        const res = await fetch('/api/lead-capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            firstName: firstName.trim() || undefined,
            source: 'landing-page',
            utmSource,
            utmMedium,
            utmCampaign,
          }),
        })

        const data = (await res.json()) as { success: boolean; error?: string }

        if (data.success) {
          setFormState('success')
          trackEvent('lead_magnet_success', { utm_source: utmSource })
        } else {
          setErrorMsg(
            data.error ?? 'Something went wrong. Please try again or email us at support@leadflow.ai.'
          )
          setFormState('error')
          trackEvent('lead_magnet_error', { reason: data.error ?? 'api_error' })
        }
      } catch {
        setErrorMsg(
          'Something went wrong. Please try again or email us at support@leadflow.ai.'
        )
        setFormState('error')
        trackEvent('lead_magnet_error', { reason: 'network_error' })
      }
    },
    [email, firstName]
  )

  return (
    <section
      ref={sectionRef}
      aria-label="Get the free AI Lead Response Playbook"
      data-testid="lead-magnet-section"
      className="bg-emerald-50 dark:bg-emerald-950/20 py-20 px-4"
    >
      <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-2xl px-8 md:px-12 py-12 text-center">

        {/* Label */}
        <p className="text-xs font-semibold tracking-widest uppercase text-emerald-600 dark:text-emerald-400 mb-3">
          Free Resource for Real Estate Agents
        </p>

        {/* Headline */}
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-4">
          Not ready to commit yet?{' '}
          <span className="block sm:inline">That&apos;s okay.</span>
        </h2>

        {/* Subheadline */}
        <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 mb-6 max-w-lg mx-auto">
          Get{' '}
          <strong className="text-slate-800 dark:text-slate-200">
            &ldquo;The 5-Minute AI Lead Response Playbook&rdquo;
          </strong>{' '}
          — free. How top agents respond faster and convert more leads, in plain English.
        </p>

        {/* Value bullets */}
        <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-2 max-w-sm mx-auto mb-8 text-left">
          {VALUE_BULLETS.map((bullet) => (
            <li key={bullet} className="flex items-start gap-2">
              <span
                className="text-emerald-500 dark:text-emerald-400 font-bold mt-0.5 shrink-0"
                aria-hidden="true"
              >
                ✓
              </span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>

        {/* Success state */}
        {formState === 'success' ? (
          <div
            data-testid="lead-magnet-success"
            className="flex flex-col items-center gap-3"
          >
            <div className="text-4xl" aria-hidden="true">
              ✅
            </div>
            <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">
              Your playbook is on its way!
            </p>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Check your inbox — it should arrive in the next minute.
            </p>
            <Link
              href="/demo"
              className="mt-2 text-sm text-emerald-600 dark:text-emerald-400 underline underline-offset-4 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
            >
              Try the live AI demo →
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            data-testid="lead-magnet-form"
            className="flex flex-col md:flex-row gap-3 max-w-md mx-auto"
          >
            {/* First name (optional) */}
            <input
              type="text"
              placeholder="Your first name (optional)"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              data-testid="lead-magnet-firstname"
              aria-label="First name (optional)"
              className="w-full md:w-36 px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shrink-0"
            />

            {/* Email */}
            <input
              type="email"
              required
              placeholder="your@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                // Clear error as user corrects input
                if (formState === 'error') {
                  setFormState('idle')
                  setErrorMsg('')
                }
              }}
              data-testid="lead-magnet-email"
              aria-label="Email address"
              aria-describedby={formState === 'error' ? 'lead-magnet-error' : undefined}
              aria-invalid={formState === 'error' ? 'true' : undefined}
              className={`flex-1 px-4 py-3 rounded-lg border ${
                formState === 'error'
                  ? 'border-red-400 focus:ring-red-400'
                  : 'border-slate-300 dark:border-slate-600 focus:ring-emerald-500'
              } bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2`}
            />

            {/* Submit button */}
            <button
              type="submit"
              disabled={formState === 'loading'}
              data-testid="lead-magnet-submit"
              className="w-full md:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer disabled:cursor-not-allowed"
            >
              {formState === 'loading' ? 'Sending…' : 'Send Me the Playbook →'}
            </button>
          </form>
        )}

        {/* Inline error message */}
        {formState === 'error' && errorMsg && (
          <p
            id="lead-magnet-error"
            data-testid="lead-magnet-error"
            role="alert"
            className="mt-3 text-sm text-red-600 dark:text-red-400"
          >
            {errorMsg}
          </p>
        )}

        {/* Trust line — hidden on success */}
        {formState !== 'success' && (
          <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
            No spam. Unsubscribe anytime. Your guide arrives in under 60 seconds.
          </p>
        )}
      </div>
    </section>
  )
}
