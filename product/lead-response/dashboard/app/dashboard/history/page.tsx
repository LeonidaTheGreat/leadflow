import { Suspense } from 'react'
import { ResponseHistory } from '@/components/dashboard/ResponseHistory'

export const metadata = {
  title: 'Response History - AI Lead Response',
}

export default function HistoryPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Response History</h1>
      </div>

      <Suspense fallback={<HistorySkeleton />}>
        <ResponseHistory />
      </Suspense>
    </div>
  )
}

function HistorySkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-32 animate-pulse"></div>
      </div>
      <div className="divide-y divide-slate-200 dark:divide-slate-800">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="p-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-48 mb-2"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
