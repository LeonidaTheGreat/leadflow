'use client'

/**
 * LeadMagnetSection — Email capture section for landing page
 * UC: feat-lead-magnet-email-capture
 *
 * Placed between Hero and Pricing sections.
 * Fires GA4 analytics events on view / submit / success / error.
 */

import { useEffect, useRef, useState, useCallback } from 'react'

// Safely call GA4 gtag if available
function gtag(...args: unknown[]) {
  if (typeof window !== 'undefined' && typeof (window as unknown as Record<string, unknown>).gtag === 'function') {
    ;(window as unknown as Record<string, (...a: unknown[]) => void>).gtag(...args)
  }
}

function trackEvent(eventName: string, params?: Record<string, unknown>) {
  gtag('event', eventName, params)
}

// Extract UTM params from current URL
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

export default function LeadMagnetSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [formState, setFormState] = useState<FormState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const hasTrackedView = useRef(false)

  // Fire lead_magnet_view when section enters viewport
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
  const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()

      trackEvent('lead_magnet_submit', { email_entered: !!email })

      // Client-side validation
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
        setErrorMsg('Network error. Please check your connection and try again.')
        setFormState('error')
        trackEvent('lead_magnet_error', { reason: 'network_error' })
      }
    },
    [email, firstName]
  )

  return (
    <section
      ref={sectionRef}
      aria-label="Lead magnet — get the free playbook"
      className="my-20"
    >
      <div className="max-w-2xl mx-auto bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl px-8 py-12 text-center">
        {/* Icon */}
        <div className="text-5xl mb-4">📋</div>

        {/* Headline */}
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-3">
          Not ready to start yet? Get the free playbook.
        </h2>

        {/* Subheadline */}
        <p className="text-slate-600 dark:text-slate-400 text-base md:text-lg mb-8 max-w-lg mx-auto">
          <strong>The 5-Minute AI Lead Response Playbook</strong> — how top agents never miss a
          lead and convert 3× more.
        </p>

        {/* Success state */}
        {formState === 'success' ? (
          <div className="flex flex-col items-center gap-3">
            <div className="text-4xl">🎉</div>
            <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">
              Check your inbox!
            </p>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              We just sent your playbook. See you on the inside.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
          >
            {/* First name (optional) */}
            <input
              type="text"
              placeholder="First name (optional)"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="flex-shrink-0 sm:w-36 px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              aria-label="First name (optional)"
            />

            {/* Email */}
            <input
              type="email"
              required
              placeholder="Your email address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (formState === 'error') setFormState('idle')
              }}
              className={`flex-1 px-4 py-3 rounded-lg border ${
                formState === 'error'
                  ? 'border-red-400 focus:ring-red-400'
                  : 'border-slate-300 dark:border-slate-600 focus:ring-emerald-500'
              } bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2`}
              aria-label="Email address"
              aria-describedby={formState === 'error' ? 'lead-magnet-error' : undefined}
            />

            {/* CTA Button */}
            <button
              type="submit"
              disabled={formState === 'loading'}
              className="flex-shrink-0 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              {formState === 'loading' ? 'Sending…' : 'Send Me the Playbook'}
            </button>
          </form>
        )}

        {/* Inline error */}
        {formState === 'error' && errorMsg && (
          <p
            id="lead-magnet-error"
            role="alert"
            className="mt-3 text-sm text-red-600 dark:text-red-400"
          >
            {errorMsg}
          </p>
        )}

        {/* Trust line */}
        {formState !== 'success' && (
          <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
            No spam. Unsubscribe anytime. Sent to your inbox in 60 seconds.
          </p>
        )}
      </div>
    </section>
  )
}
