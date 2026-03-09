'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import TrialSignupForm from '@/components/trial-signup-form'

export default function TrialSignupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      <header className="border-b border-slate-700/50">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
              <span className="text-emerald-400 font-bold text-sm">▶</span>
            </div>
            <h1 className="text-lg font-semibold text-white">LeadFlow AI</h1>
          </Link>
          <Link href="/login" className="text-sm text-slate-400 hover:text-white">
            Already have an account? Sign in
          </Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <Suspense fallback={<div className="w-full max-w-[420px] h-96 bg-slate-800/50 rounded-xl animate-pulse" />}>
          <TrialSignupForm />
        </Suspense>
      </main>
      <footer className="border-t border-slate-700/50">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-sm text-slate-500">
          <p>
            Looking for the full pilot application?{' '}
            <Link href="/pilot" className="text-emerald-400 hover:text-emerald-300">Apply here</Link>
          </p>
        </div>
      </footer>
    </div>
  )
}
