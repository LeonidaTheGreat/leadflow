import { Suspense } from 'react'
import { AnalyticsKpiDashboard } from '@/components/dashboard/AnalyticsKpiDashboard'

export const metadata = {
  title: 'Analytics - AI Lead Response',
  description: 'Real-time KPI dashboard with messaging, conversion, and engagement metrics',
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<AnalyticsLoadingSkeleton />}>
      <AnalyticsKpiDashboard />
    </Suspense>
  )
}

function AnalyticsLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded w-48 mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-slate-200 dark:bg-slate-700 rounded-lg p-6 h-24" />
        ))}
      </div>
    </div>
  )
}