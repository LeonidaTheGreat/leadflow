'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TrialBadge } from './TrialBadge'

interface UserInfo {
  planTier: string | null
  trialEndsAt: string | null
}

/**
 * Dashboard navigation bar (client component so it can fetch session/trial info).
 * Renders the trial badge when user is on trial plan.
 */
export function DashboardNav() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated && data.user) {
          setUserInfo({
            planTier: data.user.planTier,
            trialEndsAt: data.user.trialEndsAt,
          })
        }
      })
      .catch(() => {
        // Silently ignore — badge is non-critical
      })
  }, [])

  return (
    <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-xl font-bold text-slate-900 dark:text-white">
              LeadFlow AI
            </Link>
            <div className="hidden md:flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                Lead Feed
              </Link>
              <Link
                href="/dashboard/history"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                History
              </Link>
              <Link
                href="/dashboard/analytics"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                Analytics
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Trial badge — shown when user is on trial plan */}
            {userInfo && (
              <TrialBadge
                planTier={userInfo.planTier}
                trialEndsAt={userInfo.trialEndsAt}
              />
            )}
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-sm text-slate-600 dark:text-slate-400">System Online</span>
          </div>
        </div>
      </div>
    </nav>
  )
}
