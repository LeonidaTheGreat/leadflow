'use client'

import { useEffect, useRef, useState } from 'react'

const INACTIVITY_TIMEOUT_MS = 60_000

function isAlreadyLoggedIn(): boolean {
  try {
    return !!localStorage.getItem('leadflow_token')
  } catch {
    return false
  }
}

function getDismissedKey(): string {
  return 'leadflow_exit_modal_dismissed'
}

function wasRecentlyDismissed(): boolean {
  try {
    const ts = localStorage.getItem(getDismissedKey())
    if (!ts) return false
    return Date.now() - parseInt(ts, 10) < 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

function markDismissed(): void {
  try {
    localStorage.setItem(getDismissedKey(), String(Date.now()))
  } catch {}
}

function getUtmParams(): { utmSource: string | null; utmMedium: string | null; utmCampaign: string | null } {
  if (typeof window === 'undefined') return { utmSource: null, utmMedium: null, utmCampaign: null }
  const p = new URLSearchParams(window.location.search)
  return { utmSource: p.get('utm_source'), utmMedium: p.get('utm_medium'), utmCampaign: p.get('utm_campaign') }
}

export default function ProspectCaptureModal() {
  const [visible, setVisible] = useState(false)
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const triggered = useRef(false)
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function triggerModal() {
    if (triggered.current) return
    if (isAlreadyLoggedIn()) return
    if (wasRecentlyDismissed()) return
    triggered.current = true
    setVisible(true)
  }

  useEffect(() => {
    function onMouseLeave(e: MouseEvent) {
      if (e.clientY <= 0) {
        triggerModal()
      }
    }

    function resetInactivityTimer() {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
      inactivityTimer.current = setTimeout(triggerModal, INACTIVITY_TIMEOUT_MS)
    }

    document.addEventListener('mouseleave', onMouseLeave)
    document.addEventListener('mousemove', resetInactivityTimer, { passive: true })
    document.addEventListener('keydown', resetInactivityTimer, { passive: true })
    document.addEventListener('scroll', resetInactivityTimer, { passive: true })
    document.addEventListener('touchstart', resetInactivityTimer, { passive: true })
    resetInactivityTimer()

    return () => {
      document.removeEventListener('mouseleave', onMouseLeave)
      document.removeEventListener('mousemove', resetInactivityTimer)
      document.removeEventListener('keydown', resetInactivityTimer)
      document.removeEventListener('scroll', resetInactivityTimer)
      document.removeEventListener('touchstart', resetInactivityTimer)
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
    }
  }, [])

  function close() {
    setVisible(false)
    markDismissed()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('submitting')
    setErrorMsg('')

    const { utmSource, utmMedium, utmCampaign } = getUtmParams()

    try {
      const res = await fetch('/api/prospects/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, firstName: firstName || null, utmSource, utmMedium, utmCampaign, source: 'exit-intent' }),
      })
      const data = await res.json()
      if (data.success) {
        setStatus('success')
        setTimeout(() => setVisible(false), 2500)
      } else {
        setStatus('error')
        setErrorMsg(data.error || 'Something went wrong. Please try again.')
      }
    } catch {
      setStatus('error')
      setErrorMsg('Connection error. Please try again.')
    }
  }

  if (!visible) return null

  return (
    <div
      className="fixed bottom-6 right-6 z-50 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
      data-testid="exit-intent-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Get free guide"
    >
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-5 pt-5 pb-4">
        <button
          onClick={close}
          className="absolute top-3 right-3 text-white/80 hover:text-white text-xl leading-none"
          aria-label="Close"
          data-testid="exit-intent-modal-close"
        >
          ×
        </button>
        <p className="text-xs text-emerald-100 uppercase font-semibold tracking-wide mb-1">Free resource</p>
        <h2 className="text-white font-bold text-lg leading-snug">
          5 Scripts to Convert More Leads Instantly
        </h2>
        <p className="text-emerald-50 text-sm mt-1">
          Used by top agents to book more appointments — no credit card needed.
        </p>
      </div>

      <div className="px-5 py-4">
        {status === 'success' ? (
          <div className="text-center py-2" data-testid="exit-intent-success">
            <div className="text-3xl mb-2">🎉</div>
            <p className="font-semibold text-slate-900 dark:text-white">You&apos;re on the list!</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">We&apos;ll be in touch soon.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3" data-testid="exit-intent-form">
            <input
              type="text"
              placeholder="First name"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              data-testid="exit-intent-firstname"
            />
            <input
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              data-testid="exit-intent-email"
            />
            {status === 'error' && (
              <p className="text-xs text-red-500" data-testid="exit-intent-error">{errorMsg}</p>
            )}
            <button
              type="submit"
              disabled={status === 'submitting'}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-semibold text-sm rounded-lg transition-colors"
              data-testid="exit-intent-submit"
            >
              {status === 'submitting' ? 'Sending…' : 'Send Me the Scripts →'}
            </button>
            <p className="text-xs text-center text-slate-400">No spam. Unsubscribe anytime.</p>
          </form>
        )}
      </div>
    </div>
  )
}
