'use client'

/*
TASK SPEC (72cf4482-b620-4f44-919a-0cc555a51b5e)
What:
- Modify `product/lead-response/dashboard/app/dashboard/dashboard-nav.tsx` (`DASHBOARD_NAV_ITEMS`) to include a distinct Reports nav entry.
- Add `product/lead-response/dashboard/app/dashboard/reports/page.tsx` to implement a real Reports page with structured reporting value (executive summary, operational detail, action plan), separate from Analytics visual KPI exploration.
- Add `product/lead-response/dashboard/components/dashboard/ReportsDashboard.tsx` to fetch and transform reporting data for summary-oriented consumption.
- Update `product/lead-response/dashboard/app/dashboard/dashboard-nav.test.tsx` and add `product/lead-response/dashboard/app/dashboard/reports/page.test.tsx` to validate nav exposure and distinct Reports page content.

Verify:
- `cd product/lead-response/dashboard && npm test -- app/dashboard/dashboard-nav.test.tsx app/dashboard/reports/page.test.tsx`
- `cd product/lead-response/dashboard && npx next build`
- `cd /var/folders/6d/xd0z4ldx1l17klqt54scqxsc0000gp/T/leadflow-72cf4482-b620-4f44-919a-0cc555a51b5e && npm test`
- `cd /var/folders/6d/xd0z4ldx1l17klqt54scqxsc0000gp/T/leadflow-72cf4482-b620-4f44-919a-0cc555a51b5e && npm run build`
- `rg -n "href: '/dashboard/reports'|Reports" product/lead-response/dashboard/app/dashboard/dashboard-nav.tsx product/lead-response/dashboard/app/dashboard/reports/page.tsx`

Boundaries:
- Do not modify Analytics API/service behavior (`app/api/analytics/*`, `lib/services/AnalyticsService*`).
- Do not modify unrelated dashboard routes or onboarding flows.
- Do not edit protected generated docs/config files.
*/

import type React from 'react'
import { usePathname } from 'next/navigation'
import { BarChart3, Clock, FileText, Home, Settings, Shield, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'

type DashboardNavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  adminOnly?: boolean
}

export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  { href: '/dashboard', label: 'Lead Feed', icon: Home },
  { href: '/dashboard/history', label: 'History', icon: Clock },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/reports', label: 'Reports', icon: FileText },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/dashboard/admin', label: 'Admin', icon: Shield, adminOnly: true },
  { href: '/dashboard/dev', label: 'Dev', icon: Wrench, adminOnly: true },
] as const

export function DashboardNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname()

  const navItems = DASHBOARD_NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin)

  return (
    <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-2 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href))
            const Icon = item.icon

            return (
              <a
                key={item.href}
                href={item.href}
                data-testid={`nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
                  isActive
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </a>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
