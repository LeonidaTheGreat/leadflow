'use client'

import React, { useState, useEffect } from 'react'
import { NPSPromptModal } from './nps-prompt-modal'

interface PromptStatus {
  shouldShow: boolean
  trigger?: 'auto_14d' | 'auto_90d'
}

/**
 * NPSPromptContainer
 * Manages the NPS prompt lifecycle on dashboard login
 * Fetches prompt status from API and controls modal display
 */
export const NPSPromptContainer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [trigger, setTrigger] = useState<'auto_14d' | 'auto_90d'>('auto_14d')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkPromptStatus = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/nps/prompt-status')

        if (!response.ok) {
          if (response.status === 401) {
            // Not authenticated, silent fail
            return
          }
          throw new Error(`HTTP ${response.status}`)
        }

        const data: PromptStatus = await response.json()

        if (data.shouldShow && data.trigger) {
          setTrigger(data.trigger)
          setIsOpen(true)
        }
      } catch (err) {
        console.error('Error checking NPS prompt status:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    // Check prompt status on mount
    checkPromptStatus()
  }, [])

  const handleSubmit = async (score: number, text?: string) => {
    try {
      const response = await fetch('/api/nps/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: 'in-app-token',
          score,
          openText: text || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit NPS response')
      }

      // Close modal on success
      setIsOpen(false)
    } catch (err) {
      throw err
    }
  }

  if (isLoading || error) {
    return null
  }

  return (
    <NPSPromptModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onSubmit={handleSubmit}
      trigger={trigger}
    />
  )
}
