import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../globals.css'
import { DashboardNav } from './dashboard-nav'
import { PageViewTracker } from '@/components/page-view-tracker'
import { OnboardingGuard } from '@/components/onboarding-guard'
import { FeedbackButton } from '@/components/dashboard/FeedbackButton'
import { NPSPromptContainer } from '@/components/nps-prompt-container'
import { TrialNudgeBanner } from '@/components/trial-nudge-banner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI Lead Response - Dashboard',
  description: 'Real estate AI-powered lead response dashboard',
}

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className={`${inter.className} min-h-screen bg-slate-50 dark:bg-slate-950`}>
      {/* Handles auth redirects. Onboarding wizard overlay is rendered by dashboard page. */}
      <OnboardingGuard />
      <PageViewTracker />
      <NPSPromptContainer />
      <TrialNudgeBanner />
      <DashboardNav />
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
      <footer className="border-t border-slate-200 dark:border-slate-800 px-4 py-4 text-center text-xs text-slate-500 dark:text-slate-400">
        © {new Date().getFullYear()} LeadFlow AI. Operated by Imagine Squared.
      </footer>
      <FeedbackButton />
    </div>
  )
}
