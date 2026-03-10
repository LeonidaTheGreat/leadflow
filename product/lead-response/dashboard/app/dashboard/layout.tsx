import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../globals.css'
import { DashboardNav } from './dashboard-nav'
import { FeedbackButton } from '@/components/dashboard/FeedbackButton'

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
      <DashboardNav />
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
      <FeedbackButton />
    </div>
  )
}
