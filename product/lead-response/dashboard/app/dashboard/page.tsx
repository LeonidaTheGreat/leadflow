'use client'
/*
TASK SPEC (6e0fadeb-d465-4823-851e-e35c9c0e9775)
What:
- Update `product/lead-response/dashboard/app/dashboard/page.tsx` (`DashboardPage`) to render a project metadata header at the top of dashboard content.
- Add `product/lead-response/dashboard/components/dashboard/ProjectMetadataHeader.tsx` to fetch and display project metadata values.
- Add `product/lead-response/dashboard/app/api/dashboard/project-metadata/route.ts` (`GET`) to query `project_metadata` and return project name, goal, current day, deadline, and overall status.
- Add tests:
  - `product/lead-response/dashboard/tests/dashboard-project-metadata-route.test.ts` for route behavior and value derivation.
  - `product/lead-response/dashboard/tests/dashboard-project-metadata-header.test.tsx` for header rendering and fetch integration.

Verify:
- `cd product/lead-response/dashboard && npm test -- --runInBand tests/dashboard-project-metadata-route.test.ts tests/dashboard-project-metadata-header.test.tsx`
- `cd product/lead-response/dashboard && npm test`
- `npm test`
- `cd product/lead-response/dashboard && npx next build`
- `npm run build`
- `rg -n "ProjectMetadataHeader|/api/dashboard/project-metadata|TASK SPEC \\(6e0fadeb-d465-4823-851e-e35c9c0e9775\\)" product/lead-response/dashboard`

Boundaries:
- Do not modify database schema/migrations or seed scripts.
- Do not change unrelated dashboard widgets, auth flows, or API endpoints.
- Do not touch orchestrator docs/heartbeat-generated files.
*/

import { Suspense, useState } from 'react'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { SmsAnalyticsCards } from '@/components/dashboard/SmsAnalyticsCards'
import { LeadFeed } from '@/components/dashboard/LeadFeed'
import { LeadSatisfactionCardWrapper } from '@/components/dashboard/LeadSatisfactionCardWrapper'
import { PilotStatusBanner } from '@/components/dashboard/PilotStatusBanner'
import { UpgradeBanner } from '@/components/dashboard/UpgradeBanner'
import { TrialCountdownWidget } from '@/components/dashboard/TrialCountdownWidget'
import { SampleDataBanner } from '@/components/dashboard/SampleDataBanner'
import { OnboardingWizardLauncher } from '@/components/dashboard/OnboardingWizardLauncher'
import { UpgradeSuccessToast } from '@/components/dashboard/UpgradeSuccessToast'
import { AhaMomentBanner } from '@/components/dashboard/AhaMomentBanner'
import { RoiMetricsWidget } from '@/components/dashboard/RoiMetricsWidget'
import { ProjectMetadataHeader } from '@/components/dashboard/ProjectMetadataHeader'

// ---------------------------------------------------------------------------
// Send Test Lead Card — lets agents fire a real SMS through the full pipeline
// ---------------------------------------------------------------------------

type TestLeadStatus = 'idle' | 'loading' | 'success' | 'error'

function SendTestLeadCard() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [status, setStatus] = useState<TestLeadStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSend() {
    if (!phoneNumber.trim()) return

    setStatus('loading')
    setErrorMessage('')

    try {
      const res = await fetch('/api/test-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phoneNumber.trim() }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setStatus('success')
      } else {
        setStatus('error')
        setErrorMessage(data.error || 'Something went wrong. Please try again.')
      }
    } catch {
      setStatus('error')
      setErrorMessage('Network error. Please check your connection and try again.')
    }
  }

  function handleReset() {
    setStatus('idle')
    setErrorMessage('')
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-sm font-semibold">
            T
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-0.5 text-sm">
            Send Test Lead — verify your SMS pipeline
          </h3>
          <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
            Fires a fake lead through the real pipeline (AI qualification then Twilio SMS).
            Enter your phone number to receive the test message.
          </p>

          {status === 'success' ? (
            <div className="flex items-center gap-3">
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                SMS sent! Check your phone.
              </p>
              <button
                onClick={handleReset}
                className="text-xs text-amber-600 dark:text-amber-400 underline hover:no-underline"
              >
                Send another
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+14165551234"
                disabled={status === 'loading'}
                className="flex-1 min-w-0 px-3 py-1.5 text-sm rounded-md border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={status === 'loading' || !phoneNumber.trim()}
                className="px-3 py-1.5 text-sm font-medium rounded-md bg-amber-600 hover:bg-amber-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {status === 'loading' ? 'Sending...' : 'Send Test Lead'}
              </button>
            </div>
          )}

          {status === 'error' && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">{errorMessage}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dashboard Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <ProjectMetadataHeader />

      {/* Success toast -- shown after returning from Stripe checkout (?upgrade=success) */}
      <Suspense fallback={null}>
        <UpgradeSuccessToast />
      </Suspense>

      {/* Upgrade Banner -- shows for paid tier agents */}
      <UpgradeBanner />

      {/* Trial Countdown Widget -- shows for trial agents with countdown and 3-tier urgency */}
      <TrialCountdownWidget />

      {/* Pilot Status Banner -- shows for pilot agents */}
      <PilotStatusBanner />

      {/* Sample Data Banner -- shows for first-time users with sample leads */}
      <SampleDataBanner />

      {/* Onboarding Wizard Launcher -- shows if onboarding not completed */}
      <OnboardingWizardLauncher />

      {/* Aha Moment Banner -- shows for trial users who haven't completed simulator */}
      <AhaMomentBanner />

      {/* ROI Metrics Widget -- shows value LeadFlow delivers */}
      <Suspense fallback={<RoiMetricsWidgetSkeleton />}>
        <RoiMetricsWidget />
      </Suspense>

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

      {/* SMS Analytics Cards -- displays SMS delivery, reply, and booking conversion rates */}
      <Suspense fallback={<SmsAnalyticsCardsSkeleton />}>
        <SmsAnalyticsCards />
      </Suspense>

      {/* Lead Satisfaction Widget -- renders only when >=5 responses collected */}
      <Suspense fallback={null}>
        <LeadSatisfactionCardWrapper />
      </Suspense>

      <Suspense fallback={<LeadFeedSkeleton />}>
        <LeadFeed />
      </Suspense>

      {/* Send Test Lead -- verify the end-to-end SMS pipeline */}
      <SendTestLeadCard />

      {/* Next Steps */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Next Steps</h3>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
          <li>Connect FUB webhook to auto-import leads (URL in Settings)</li>
          <li>Add real Anthropic API key for AI qualification</li>
          <li>Configure Twilio for live SMS sending</li>
          <li>Complete the onboarding wizard to activate all features</li>
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

function SmsAnalyticsCardsSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32 animate-pulse"></div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800 animate-pulse">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24 mb-2"></div>
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-16 mb-2"></div>
            <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-28"></div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RoiMetricsWidgetSkeleton() {
  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-lg p-6 border border-emerald-200 dark:border-emerald-800 animate-pulse">
      <div className="h-6 bg-emerald-200 dark:bg-emerald-800 rounded w-48 mb-4"></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded p-4">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24 mb-2"></div>
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
          </div>
        ))}
      </div>
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
