import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../globals.css'
import { DashboardNav } from './dashboard-nav'
import { PageViewTracker } from '@/components/page-view-tracker'
import { OnboardingGuard } from '@/components/onboarding-guard'
import { FeedbackButton } from '@/components/dashboard/FeedbackButton'
import { NPSPromptContainer } from '@/components/nps-prompt-container'

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
      <DashboardNav />
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
      <FeedbackButton />
    </div>
  )
}
