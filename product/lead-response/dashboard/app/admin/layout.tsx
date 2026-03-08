import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'LeadFlow Admin',
  description: 'Admin tools for LeadFlow AI',
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={`${inter.className} min-h-screen bg-slate-50 dark:bg-slate-950`}>
      <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-6">
              <a href="/dashboard" className="text-lg font-bold text-slate-900 dark:text-white">
                LeadFlow AI
              </a>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Admin
              </span>
              <a
                href="/admin/simulator"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                Simulator
              </a>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Admin Mode</span>
            </div>
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
