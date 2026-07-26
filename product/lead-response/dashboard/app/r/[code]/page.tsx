'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

// Referral landing page: sets referral_code cookie and redirects to signup.
// Tracking: the signup flow reads the cookie and stores it in real_estate_agents.referred_by_agent_id.
export default function ReferralLandingPage() {
  const params = useParams()
  const router = useRouter()
  const code = typeof params.code === 'string' ? params.code : ''

  useEffect(() => {
    if (!code) {
      router.replace('/signup')
      return
    }

    // Store referral code in cookie (30-day expiry) and sessionStorage
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString()
    document.cookie = `referral_code=${encodeURIComponent(code)}; expires=${expires}; path=/; SameSite=Lax`
    sessionStorage.setItem('referral_code', code)

    // Fire analytics event
    if (typeof window !== 'undefined' && (window as any).posthog) {
      ;(window as any).posthog.capture('referral_signup_started', { referral_code: code })
    }

    router.replace(`/signup?ref=${encodeURIComponent(code)}`)
  }, [code, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-600">Setting up your referral…</p>
      </div>
    </div>
  )
}
