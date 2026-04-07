import type { Metadata } from 'next'
import { DashboardNav } from '../dashboard/dashboard-nav'
import { PageViewTracker } from '@/components/page-view-tracker'
import { OnboardingGuard } from '@/components/onboarding-guard'
import { FeedbackButton } from '@/components/dashboard/FeedbackButton'
import { NPSPromptContainer } from '@/components/nps-prompt-container'
import { TrialNudgeBanner } from '@/components/trial-nudge-banner'

export const metadata: Metadata = {
  title: 'AI Lead Response - Settings',
  description: 'Manage your account, integrations, billing, and preferences',
}

export default function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <OnboardingGuard />
      <PageViewTracker />
      <NPSPromptContainer />
      <TrialNudgeBanner />
      <DashboardNav />
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
      <FeedbackButton />
    </div>
  )
}
