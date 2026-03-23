/**
 * NPS Survey Prompt Component
 * In-app NPS survey modal for dashboard
 * feat-nps-agent-feedback
 */

'use client'

import { useState, useEffect } from 'react'
import { X, ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react'

interface NPSPromptProps {
  agentId: string
  authToken: string
  onDismiss?: () => void
}

export function NPSPrompt({ agentId, authToken, onDismiss }: NPSPromptProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showSurvey, setShowSurvey] = useState(false)
  const [selectedScore, setSelectedScore] = useState<number | null>(null)
  const [openText, setOpenText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if we should show the prompt
    checkShouldShowPrompt()
  }, [])

  const checkShouldShowPrompt = async () => {
    try {
      const response = await fetch('/api/survey/nps/prompt-status', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.shouldShow) {
          setIsVisible(true)
        }
      }
    } catch (error) {
      console.error('Error checking NPS prompt status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDismiss = async () => {
    try {
      await fetch('/api/survey/nps/dismiss', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      })
    } catch (error) {
      console.error('Error dismissing NPS prompt:', error)
    }

    setIsVisible(false)
    onDismiss?.()
  }

  const handleScoreSelect = (score: number) => {
    setSelectedScore(score)
    setShowSurvey(true)
  }

  const handleSubmit = async () => {
    if (selectedScore === null) return

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/survey/nps', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          score: selectedScore,
          openText: openText.trim() || null,
          respondedVia: 'in_app',
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setIsSubmitted(true)
        setTimeout(() => {
          setIsVisible(false)
          onDismiss?.()
        }, 3000)
      } else {
        setError(data.error || 'Failed to submit feedback')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading || !isVisible) return null

  if (isSubmitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-6 text-center shadow-xl">
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <ThumbsUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900">Thank You!</h3>
          <p className="text-gray-600">Your feedback helps us improve LeadFlow AI.</p>
        </div>
      </div>
    )
  }

  if (showSurvey) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Quick Feedback</h3>
            <button
              onClick={handleDismiss}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="mb-4 text-gray-600">
            You selected: <span className="font-semibold text-blue-600">{selectedScore}/10</span>
          </p>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              What's the #1 thing we could improve? (optional)
            </label>
            <textarea
              value={openText}
              onChange={(e) => setOpenText(e.target.value)}
              placeholder="Tell us what would make LeadFlow better for you..."
              maxLength={500}
              rows={4}
              className="w-full rounded-md border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-right text-xs text-gray-500">
              {openText.length}/500
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setShowSurvey(false)}
              className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">How are we doing?</h3>
          <button
            onClick={handleDismiss}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-6 text-gray-600">
          How likely are you to recommend LeadFlow AI to another real estate agent?
        </p>

        <div className="mb-4 flex justify-between gap-1">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
            <button
              key={score}
              onClick={() => handleScoreSelect(score)}
              className={`flex h-10 w-8 items-center justify-center rounded text-sm font-medium transition-colors sm:h-12 sm:w-10 sm:text-base ${
                score <= 6
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : score <= 8
                  ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {score}
            </button>
          ))}
        </div>

        <div className="mb-4 flex justify-between text-xs text-gray-500">
          <span>Not likely</span>
          <span>Very likely</span>
        </div>

        <p className="text-center text-xs text-gray-400">
          Click a number to continue
        </p>
      </div>
    </div>
  )
}
