'use client'

import { useEffect, useState } from 'react'
import { Clock, AlertTriangle, Sparkles } from 'lucide-react'

interface PilotStatus {
  isPilot: boolean
  pilotStartedAt: string | null
  pilotExpiresAt: string | null
  daysRemaining: number
  isExpired: boolean
}

export function PilotStatusBanner() {
  const [status, setStatus] = useState<PilotStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPilotStatus() {
      try {
        const response = await fetch('/api/auth/pilot-status')
        if (response.ok) {
          const data = await response.json()
          setStatus(data)
        }
      } catch (err) {
        console.error('Failed to fetch pilot status:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPilotStatus()
  }, [])

  if (loading || !status || !status.isPilot) {
    return null
  }

  // Show expired state
  if (status.isExpired) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-amber-900 dark:text-amber-100">
              Your pilot has expired
            </h3>
            <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
              Your 60-day free pilot has ended. Upgrade now to keep your AI lead response active.
            </p>
            <div className="mt-3">
              <a
                href="/settings/billing"
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Upgrade Now →
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show active pilot state
  const daysRemaining = status.daysRemaining
  const isEndingSoon = daysRemaining <= 7

  return (
    <div className={`rounded-lg p-4 mb-6 ${
      isEndingSoon 
        ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800' 
        : 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
    }`}>
      <div className="flex items-start gap-3">
        {isEndingSoon ? (
          <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        ) : (
          <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className={`font-semibold ${
              isEndingSoon 
                ? 'text-amber-900 dark:text-amber-100' 
                : 'text-emerald-900 dark:text-emerald-100'
            }`}>
              🎉 You're on a free pilot
            </h3>
            <span className={`text-sm font-medium px-2 py-1 rounded-full ${
              isEndingSoon 
                ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' 
                : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
            }`}>
              {daysRemaining} days remaining
            </span>
          </div>
          <p className={`text-sm mt-1 ${
            isEndingSoon 
              ? 'text-amber-800 dark:text-amber-200' 
              : 'text-emerald-800 dark:text-emerald-200'
          }`}>
            {isEndingSoon 
              ? `Your pilot ends in ${daysRemaining} days. Upgrade to keep your AI lead response running.`
              : 'Enjoy 60 days of free AI lead response. No credit card required.'
            }
          </p>
          {isEndingSoon && (
            <div className="mt-3">
              <a
                href="/settings/billing"
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Upgrade Now →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
