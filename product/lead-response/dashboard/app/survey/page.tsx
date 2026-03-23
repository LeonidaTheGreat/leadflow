'use client'

import { useState, useCallback, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Star, Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export default function SurveyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading survey...</span>
        </div>
      </div>
    }>
      <SurveyContent />
    </Suspense>
  )
}

function SurveyContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const preselectedScore = searchParams.get('score')

  const [isLoading, setIsLoading] = useState(true)
  const [isValid, setIsValid] = useState(false)
  const [agentName, setAgentName] = useState('')
  const [alreadyResponded, setAlreadyResponded] = useState(false)
  const [score, setScore] = useState<number | null>(preselectedScore ? parseInt(preselectedScore) : null)
  const [openText, setOpenText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setIsLoading(false)
        setError('Invalid survey link. Please check your email for a valid link.')
        return
      }

      try {
        const response = await fetch(`/api/nps/verify?token=${encodeURIComponent(token)}`)
        const data = await response.json()

        if (!response.ok || !data.valid) {
          setError(data.error || 'Invalid or expired survey link')
          setIsValid(false)
        } else {
          setIsValid(true)
          setAgentName(data.agent?.name || 'there')
          setAlreadyResponded(data.alreadyResponded)
        }
      } catch (err) {
        setError('Failed to verify survey link')
        setIsValid(false)
      } finally {
        setIsLoading(false)
      }
    }

    verifyToken()
  }, [token])

  const handleSubmit = useCallback(async () => {
    if (score === null || !token) return

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/nps/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          score,
          openText: openText.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit response')
      }

      setSubmitted(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }, [token, score, openText])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading survey...</span>
        </div>
      </div>
    )
  }

  if (!isValid && error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Survey Link Invalid
          </h1>
          <p className="text-slate-600 dark:text-slate-400">{error}</p>
        </div>
      </div>
    )
  }

  if (alreadyResponded) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Already Submitted
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            You've already completed this survey. Thank you for your feedback!
          </p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Thank You!
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Your feedback helps us improve LeadFlow AI for real estate agents like you.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Quick Feedback
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Hi {agentName}, how likely are you to recommend LeadFlow AI to another agent?
          </p>
        </div>

        {/* Score Selection */}
        <div className="mb-6">
          <div className="flex justify-between gap-1 mb-2">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <button
                key={num}
                onClick={() => setScore(num)}
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg text-sm sm:text-base font-semibold transition-all ${
                  score === num
                    ? 'bg-emerald-500 text-white scale-110'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-sm text-slate-400">
            <span>Not likely</span>
            <span>Very likely</span>
          </div>
        </div>

        {/* Score Labels */}
        {score !== null && (
          <div className="text-center mb-6">
            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
              score <= 6
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : score <= 8
                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
            }`}>
              <Star className="w-4 h-4" />
              {score <= 6 ? 'Detractor' : score <= 8 ? 'Passive' : 'Promoter'}
            </span>
          </div>
        )}

        {/* Open Text */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            What's the #1 thing we could improve? (optional)
          </label>
          <textarea
            value={openText}
            onChange={(e) => setOpenText(e.target.value)}
            placeholder="Tell us more about your experience..."
            maxLength={500}
            rows={4}
            className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-slate-400">
              {openText.length}/500
            </span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={score === null || isSubmitting}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-semibold rounded-lg transition-colors"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Submit Feedback
            </>
          )}
        </button>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Your feedback is anonymous and helps us improve LeadFlow AI.
        </p>
      </div>
    </div>
  )
}
