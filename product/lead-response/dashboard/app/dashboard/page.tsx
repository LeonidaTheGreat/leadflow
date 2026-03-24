'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { SmsAnalyticsCards } from '@/components/dashboard/SmsAnalyticsCards'
import { SessionAnalyticsCard } from '@/components/dashboard/SessionAnalyticsCard'
import { LeadFeed } from '@/components/dashboard/LeadFeed'
import { LeadSatisfactionCardWrapper } from '@/components/dashboard/LeadSatisfactionCardWrapper'
import { PilotStatusBanner } from '@/components/dashboard/PilotStatusBanner'
import { AhaMomentBanner } from '@/components/dashboard/AhaMomentBanner'
import { OnboardingWizardOverlay } from '@/components/onboarding-wizard-overlay'

function getFromStorage(key: string): string | null {
  try {
    return localStorage.getItem(key) || sessionStorage.getItem(key) || null
  } catch {
    return null
  }
}

interface StoredUser {
  id?: string
  onboardingCompleted?: boolean
  [key: string]: unknown
}

export default function DashboardPage() {
  const router = useRouter()
  const [showWizard, setShowWizard] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Check onboarding status and show wizard if not completed
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      const token = getFromStorage('leadflow_token')

      // No token → redirect to login (should be caught by middleware, but safety check)
      if (!token) {
        router.replace('/login')
        return
      }

      // Try cached user data first (fastest path)
      const userRaw = getFromStorage('leadflow_user')
      if (userRaw) {
        try {
          const user: StoredUser = JSON.parse(userRaw)
          if (user.onboardingCompleted === false) {
            setShowWizard(true)
          }
          setIsLoading(false)
          return
        } catch {
          // malformed JSON — fall through to API check
        }
      }

      // Fallback: ask the server whether the agent still needs onboarding
      try {
        const response = await fetch('/api/setup/status', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await response.json()

        if (data.wizardState === null || data.wizardState?.completed_at === null) {
          setShowWizard(true)
        }
      } catch {
        // Network failure — don't block the user
      } finally {
        setIsLoading(false)
      }
    }

    checkOnboardingStatus()
  }, [router])

  const handleWizardComplete = () => {
    setShowWizard(false)
    // Update cached user data to reflect completion
    const userRaw = getFromStorage('leadflow_user')
    if (userRaw) {
      try {
        const user: StoredUser = JSON.parse(userRaw)
        user.onboardingCompleted = true
        localStorage.setItem('leadflow_user', JSON.stringify(user))
        sessionStorage.setItem('leadflow_user', JSON.stringify(user))
      } catch {
        // ignore parse errors
      }
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Onboarding Wizard Overlay - appears automatically when onboarding_completed=false */}
      {showWizard && (
        <OnboardingWizardOverlay
          onComplete={handleWizardComplete}
          onDismiss={() => setShowWizard(false)}
        />
      )}

      {/* Aha Moment Banner — shows for agents who skipped simulator during onboarding */}
      <AhaMomentBanner agentId="test-agent-id" />

      {/* Pilot Status Banner — shows for pilot agents */}
      <PilotStatusBanner />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Lead Feed</h1>
        <div className="flex gap-2">
          <select className="px-3 py-2 rounded-md text-sm border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
            <option value="all">All Leads</option>
            <option value="new">New</option>
            <option value="qualified">Qualified</option>
            <option value="responded">Responded</option>
          </select>
          <select className="px-3 py-2 rounded-md text-sm border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      <Suspense fallback={<StatsCardsSkeleton />}>
        <StatsCards />
      </Suspense>

      {/* Pilot Engagement Metrics — displays session analytics for all pilots */}
      <SessionAnalyticsCard />

      {/* Lead Satisfaction Widget — renders only when ≥5 responses collected */}
      <LeadSatisfactionCardWrapper />

      <Suspense fallback={<LeadFeedSkeleton />}>
        <LeadFeed />
      </Suspense>

      {/* Next Steps */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">🚀 Next Steps</h3>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
          <li>Connect FUB webhook to auto-import leads (URL in Settings)</li>
          <li>Add real Anthropic API key for AI qualification</li>
          <li>Configure Twilio for live SMS sending</li>
          <li>Recruit 3-5 pilot agents for Week 2 testing</li>
        </ul>
      </div>
    </div>
  )
}

function StatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800 animate-pulse">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20 mb-2"></div>
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
        </div>
      ))}
    </div>
  )
}

function LeadFeedSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-32 animate-pulse"></div>
      </div>
      <div className="divide-y divide-slate-200 dark:divide-slate-800">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32 mb-2"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-48"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
