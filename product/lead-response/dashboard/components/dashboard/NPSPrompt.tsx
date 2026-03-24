'use client'

import { useState, useEffect } from 'react'
import { X, Star, Send, Loader2, CheckCircle } from 'lucide-react'

type TriggerType = 'auto_14d' | 'auto_90d'

export function NPSPrompt() {
  const [shouldShow, setShouldShow] = useState(false)
  const [trigger, setTrigger] = useState<TriggerType | null>(null)
  const [score, setScore] = useState<number | null>(null)
  const [openText, setOpenText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [isDismissing, setIsDismissing] = useState(false)

  useEffect(() => {
    // Check if prompt should be shown (after a small delay to ensure client-side state is ready)
    const timer = setTimeout(async () => {
      try {
        const response = await fetch('/api/nps/prompt')
        if (response.ok) {
          const data = await response.json()
          if (data.shouldShow) {
            setShouldShow(true)
            setTrigger(data.trigger)
          }
        }
      } catch (error) {
        console.error('Error checking NPS prompt:', error)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  async function handleDismiss() {
    if (!trigger) return

    setIsDismissing(true)
    try {
      await fetch('/api/nps/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger }),
      })
    } catch (error) {
      console.error('Error dismissing NPS prompt:', error)
    } finally {
      setShouldShow(false)
      setIsDismissing(false)
    }
  }

  async function handleSubmit() {
    if (score === null) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/nps/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: 'in-app-token',
          score,
          openText: openText.trim() || undefined,
        }),
      })

      if (response.ok) {
        setSubmitted(true)
        setTimeout(() => {
          setShouldShow(false)
        }, 2000)
      }
    } catch (error) {
      console.error('Error submitting NPS:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!shouldShow) return null

  return (
    <div className="fixed bottom-24 right-6 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-40">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
        <h3 className="font-semibold text-slate-900 dark:text-white">
          Quick Question
        </h3>
        <button
          onClick={handleDismiss}
          disabled={isDismissing}
          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
        >
          <X className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {submitted ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-slate-700 dark:text-slate-300">
              Thank you for your feedback!
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              How likely are you to recommend LeadFlow AI to another agent?
            </p>

            {/* Score Selection */}
            <div className="flex justify-between gap-1 mb-4">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <button
                  key={num}
                  onClick={() => setScore(num)}
                  className={`w-7 h-7 rounded text-xs font-semibold transition-all ${
                    score === num
                      ? 'bg-emerald-500 text-white scale-110'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>

            {/* Score Labels */}
            <div className="flex justify-between text-xs text-slate-400 mb-4">
              <span>Not likely</span>
              <span>Very likely</span>
            </div>

            {/* Selected Score Label */}
            {score !== null && (
              <div className="text-center mb-4">
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                  score <= 6
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : score <= 8
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                }`}>
                  <Star className="w-3 h-3" />
                  {score <= 6 ? 'Detractor' : score <= 8 ? 'Passive' : 'Promoter'}
                </span>
              </div>
            )}

            {/* Open Text */}
            <textarea
              value={openText}
              onChange={(e) => setOpenText(e.target.value)}
              placeholder="What's the #1 thing we could improve? (optional)"
              maxLength={500}
              rows={3}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none text-sm text-slate-900 dark:text-white placeholder-slate-400 mb-3"
            />
            <div className="text-right text-xs text-slate-400 mb-4">
              {openText.length}/500
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={score === null || isSubmitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-medium rounded-lg transition-colors text-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
