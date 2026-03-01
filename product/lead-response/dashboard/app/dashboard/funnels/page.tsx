'use client'

import { Suspense } from 'react'
import { PostHogFunnelsDashboard } from '@/components/dashboard/PostHogFunnelsDashboard'

export default function PostHogFunnelsPage() {
  return (
    <Suspense fallback={<FunnelsLoadingSkeleton />}>
      <PostHogFunnelsDashboard />
    </Suspense>
  )
}

function FunnelsLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded w-64 mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-slate-200 dark:bg-slate-700 rounded-lg p-6 h-24" />
        ))}
      </div>
      <div className="bg-slate-200 dark:bg-slate-700 rounded-lg p-6 h-96" />
    </div>
  )
}
