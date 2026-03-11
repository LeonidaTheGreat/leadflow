'use client'

import { useEffect, useState } from 'react'
import { Info, X } from 'lucide-react'

interface SampleDataStatus {
  hasSampleLeads: boolean
  sampleLeadCount: number
  dismissed: boolean
}

export function SampleDataBanner() {
  const [status, setStatus] = useState<SampleDataStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    async function fetchSampleDataStatus() {
      try {
        const response = await fetch('/api/leads/sample-status')
        if (response.ok) {
          const data = await response.json()
          setStatus(data)
          
          // Check if user has dismissed this banner before
          const dismissedKey = `sample-data-dismissed-${data.agentId}`
          const isDismissed = localStorage.getItem(dismissedKey) === 'true'
          setDismissed(isDismissed)
        }
      } catch (err) {
        console.error('Failed to fetch sample data status:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchSampleDataStatus()
  }, [])

  const handleDismiss = () => {
    setDismissed(true)
    if (status) {
      const dismissedKey = `sample-data-dismissed-${status.hasSampleLeads}`
      localStorage.setItem(dismissedKey, 'true')
    }
    
    // Log event
    fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'sample_data_banner_dismissed',
        properties: {}
      })
    }).catch(() => {})
  }

  if (loading || !status || !status.hasSampleLeads || dismissed) {
    return null
  }

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                👋 Welcome! Here are some sample leads
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                We've added {status.sampleLeadCount} demo leads to show you how LeadFlow works. 
                These are clearly marked and won't affect your analytics. 
                Try clicking on a lead to see the AI conversation!
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
