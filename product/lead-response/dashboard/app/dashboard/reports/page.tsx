import { Suspense } from 'react'
import { ReportsDashboard } from '@/components/dashboard/ReportsDashboard'

export const metadata = {
  title: 'Reports - AI Lead Response',
  description: 'Operational reporting page with summary, risks, and recommended actions',
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<ReportsLoadingSkeleton />}>
      <ReportsDashboard />
    </Suspense>
  )
}

function ReportsLoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 w-40 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="h-24 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[...Array(6)].map((_, idx) => (
          <div key={idx} className="h-24 rounded bg-slate-200 dark:bg-slate-700" />
        ))}
      </div>
    </div>
  )
}
