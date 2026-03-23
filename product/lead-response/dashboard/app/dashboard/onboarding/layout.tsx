import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../../globals.css'
import { DashboardNav } from '../dashboard-nav'
import { PageViewTracker } from '@/components/page-view-tracker'

/**
 * Dashboard Onboarding Layout
 *
 * This layout is used for /dashboard/onboarding and intentionally excludes the OnboardingGuard.
 * This allows new users to access the onboarding wizard after signup without being redirected.
 * The OnboardingGuard is present in the parent dashboard/layout.tsx to protect other dashboard routes.
 */

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Setup - LeadFlow AI',
  description: 'Complete your LeadFlow AI setup',
}

export default function OnboardingLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className={`${inter.className} min-h-screen bg-slate-50 dark:bg-slate-950`}>
      {/* No OnboardingGuard here — allows new users to access this route during onboarding */}
      <PageViewTracker />
      <DashboardNav />
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
