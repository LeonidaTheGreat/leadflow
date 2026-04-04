'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function TrialExpiredPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkTrialStatus = async () => {
      try {
        const response = await fetch('/api/auth/trial-status')
        if (!response.ok) {
          router.push('/login')
          return
        }

        const data = await response.json()
        
        // If trial is not expired, redirect back to dashboard
        if (!data.isExpired) {
          router.push('/dashboard')
          return
        }

        setIsLoading(false)
      } catch (error) {
        console.error('Error checking trial status:', error)
        router.push('/login')
      }
    }

    checkTrialStatus()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
        <div className="flex justify-center mb-6">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/20 rounded-full">
            <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center text-slate-900 dark:text-white mb-4">
          Your Trial Has Ended
        </h1>

        <p className="text-center text-slate-600 dark:text-slate-300 mb-6">
          Your LeadFlow AI trial has expired. All your leads and settings are saved and ready to go.
        </p>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Good news:</strong> You still have a few days to upgrade and restore your account. Don't miss out on these leads!
          </p>
        </div>

        <div className="space-y-3">
          <a
            href="/settings/billing"
            data-testid="trial-expired-upgrade-pro"
            className="block w-full px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors text-center"
          >
            Upgrade to Pro ($149/month)
          </a>

          <a
            href="/pricing"
            data-testid="trial-expired-explore-plans"
            className="block w-full px-4 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-semibold rounded-lg transition-colors text-center"
          >
            Compare All Plans
          </a>

          <a
            href="mailto:support@leadflow.ai"
            className="block w-full px-4 py-3 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-lg transition-colors text-center"
          >
            Contact Support
          </a>
        </div>

        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6">
          Questions? Email us at <a href="mailto:support@leadflow.ai" className="text-emerald-500 hover:text-emerald-600">support@leadflow.ai</a>
        </p>
      </div>
    </div>
  )
}
