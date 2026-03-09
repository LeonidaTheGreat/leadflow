'use client'

import { useEffect, useState } from 'react'
import { X, ThumbsUp, ThumbsDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * NPSPrompt - In-app NPS survey prompt
 * Shows when agent is due for NPS survey based on schedule
 */
export function NPSPrompt() {
  const [shouldShow, setShouldShow] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [score, setScore] = useState<number | null>(null)
  const [feedback, setFeedback] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    // Check if NPS prompt should be shown
    const checkNPSStatus = async () => {
      try {
        // Get agent ID from localStorage or use a default for now
        const agentId = localStorage.getItem('agentId') || 'test-agent-id'
        const response = await fetch('/api/nps/status', {
          headers: { 'x-agent-id': agentId },
        })
        if (response.ok) {
          const data = await response.json()
          if (data.shouldShow) {
            setShouldShow(true)
          }
        }
      } catch (error) {
        console.error('Failed to check NPS status:', error)
      }
    }

    checkNPSStatus()
  }, [])

  const handleDismiss = async () => {
    setIsDismissed(true)
    try {
      // Get agent ID from localStorage or use a default for now
      const agentId = localStorage.getItem('agentId') || 'test-agent-id'
      await fetch('/api/nps/dismiss', {
        method: 'POST',
        headers: { 'x-agent-id': agentId },
      })
    } catch (error) {
      console.error('Failed to dismiss NPS prompt:', error)
    }
  }

  const handleSubmit = async () => {
    if (score === null) return

    setIsSubmitting(true)
    try {
      // Get agent ID from localStorage or use a default for now
      const agentId = localStorage.getItem('agentId') || 'test-agent-id'
      const response = await fetch('/api/nps/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-agent-id': agentId,
        },
        body: JSON.stringify({
          score,
          feedback: feedback.trim() || null,
        }),
      })

      if (response.ok) {
        setSubmitted(true)
        setTimeout(() => {
          setIsDismissed(true)
        }, 2000)
      }
    } catch (error) {
      console.error('Failed to submit NPS:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!shouldShow || isDismissed) {
    return null
  }

  return (
    <div className="fixed bottom-6 left-6 z-50 w-96 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800">
        <h3 className="font-semibold text-slate-900 dark:text-white">How are we doing?</h3>
        <button
          onClick={handleDismiss}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4">
        {submitted ? (
          <div className="text-center py-4">
            <ThumbsUp className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <p className="text-slate-900 dark:text-white font-medium">Thank you for your feedback!</p>
          </div>
        ) : score === null ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              How likely are you to recommend LeadFlow AI to a colleague?
            </p>
            <div className="flex justify-between gap-1">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button
                  key={n}
                  onClick={() => setScore(n)}
                  className="w-7 h-7 text-xs font-medium rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900 dark:hover:text-blue-300 transition-colors"
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Not likely</span>
              <span>Very likely</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold text-lg">
                {score}
              </span>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                {score <= 6 ? 'What could we improve?' : score <= 8 ? 'What would make it even better?' : 'What do you love most?'}
              </p>
            </div>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Share your thoughts (optional)..."
              className="w-full h-20 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setScore(null)}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting ? 'Sending...' : 'Submit'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
