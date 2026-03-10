import { Suspense } from 'react'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { SmsAnalyticsCards } from '@/components/dashboard/SmsAnalyticsCards'
import { LeadFeed } from '@/components/dashboard/LeadFeed'
import { LeadSatisfactionCard } from '@/components/dashboard/LeadSatisfactionCard'
import { PilotStatusBanner } from '@/components/dashboard/PilotStatusBanner'

export const metadata = {
  title: 'Lead Feed - AI Lead Response',
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
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

      {/* SMS Analytics — Delivery Rate, Reply Rate, Booking Conversion */}
      <SmsAnalyticsCards />

      {/* Lead Satisfaction Widget — renders only when ≥5 responses collected */}
      {/* TODO: Replace 'test-agent-id' with real agentId from auth session */}
      <LeadSatisfactionCard agentId="test-agent-id" />

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
