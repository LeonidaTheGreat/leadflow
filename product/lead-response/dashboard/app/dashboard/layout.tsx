import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../globals.css'

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
    </div>
  )
}

function DashboardNav() {
  return (
    <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <a href="/dashboard" className="text-xl font-bold text-slate-900 dark:text-white">
              LeadFlow AI
            </a>
            <div className="hidden md:flex items-center gap-4">
              <a
                href="/dashboard"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                Lead Feed
              </a>
              <a
                href="/dashboard/history"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                History
              </a>
              <a
                href="/dashboard/analytics"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                Analytics
              </a>
              <a
                href="/admin/simulator"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                Simulator
              </a>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
            <span className="text-sm text-slate-600 dark:text-slate-400">System Online</span>
          </div>
        </div>
      </div>
    </nav>
  )
}
