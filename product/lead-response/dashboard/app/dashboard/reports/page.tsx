/*
TASK SPEC (36c178f4-b6c2-423d-9cf0-3a0284803d82)
What:
- Add product/lead-response/dashboard/app/dashboard/reports/page.tsx (Reports route entrypoint).
- Add product/lead-response/dashboard/components/dashboard/ReportsDashboard.tsx (distinct Reports IA/UX).
- Add product/lead-response/dashboard/app/api/reports/summary/route.ts (reports API route).
- Add product/lead-response/dashboard/lib/services/ReportsService.ts (reports data model/business logic).
- Update product/lead-response/dashboard/app/dashboard/dashboard-nav.tsx and nav tests to wire /dashboard/reports truthfully.
- Add product/lead-response/dashboard/tests/reports-service.test.ts for report calculations and failure handling.

Verify:
- cd /Users/clawdbot/projects/leadflow && npm test -- product/lead-response/dashboard/app/dashboard/dashboard-nav.test.tsx product/lead-response/dashboard/app/dashboard/dashboard-nav.test.ts product/lead-response/dashboard/tests/reports-service.test.ts
- cd /Users/clawdbot/projects/leadflow && npm test
- cd /Users/clawdbot/projects/leadflow && npm run build
- grep -n "href: '/dashboard/reports'" product/lead-response/dashboard/app/dashboard/dashboard-nav.tsx should return 1+ matches.
- Confirm /dashboard/reports page imports ReportsDashboard (not AnalyticsKpiDashboard).

Boundaries:
- Do not modify Analytics page/API/service behavior.
- Do not add assignments or settings route changes.
- Do not touch database schema/migrations.
*/

import { Suspense } from 'react'
import { ReportsDashboard } from '@/components/dashboard/ReportsDashboard'

export const metadata = {
  title: 'Reports - AI Lead Response',
  description: 'Operational reports with actionable lead follow-up, conversion blockers, and weekly outcomes',
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
    <div className="space-y-6 animate-pulse">
      <div className="h-10 w-64 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="h-24 rounded-lg bg-slate-200 dark:bg-slate-700" />
        ))}
      </div>
      <div className="h-64 rounded-lg bg-slate-200 dark:bg-slate-700" />
    </div>
  )
}
