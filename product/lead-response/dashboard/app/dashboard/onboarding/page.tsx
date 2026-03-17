/**
 * /dashboard/onboarding — Redirect to /setup
 *
 * The trial-signup API sends new users to /dashboard/onboarding.
 * /setup is the actual onboarding wizard, so we redirect there.
 * 
 * UC-9 AC-3: redirect must happen within 5s (this is client-side immediate)
 */
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardOnboardingRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Immediately redirect to the real onboarding wizard
    router.replace('/setup')
  }, [router])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-slate-600 dark:text-slate-400">Setting up your account…</p>
      </div>
    </div>
  )
}
