'use client'

/**
 * NPS Survey Modal Component
 * 
 * Design Reference: /docs/DESIGN-NPS-AGENT-FEEDBACK.md
 * 
 * This is a DESIGN MOCKUP / REFERENCE IMPLEMENTATION.
 * Dev should adapt this to use actual shadcn/ui Dialog, Button components
 * and wire up to real API endpoints.
 */

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface NPSSurveyModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (score: number, feedback: string) => void
  onDismiss: () => void
  surveyTrigger?: 'auto_14d' | 'auto_90d' | 'manual'
}

export function NPSSurveyModal({
  isOpen,
  onClose,
  onSubmit,
  onDismiss,
  surveyTrigger = 'auto_14d',
}: NPSSurveyModalProps) {
  const [selectedScore, setSelectedScore] = useState<number | null>(null)
  const [feedback, setFeedback] = useState('')
  const [isVisible, setIsVisible] = useState(false)

  // Animation handling
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsVisible(true), 10)
    } else {
      setIsVisible(false)
    }
  }, [isOpen])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedScore(null)
      setFeedback('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleScoreSelect = (score: number) => {
    setSelectedScore(score)
  }

  const handleSubmit = () => {
    if (selectedScore !== null) {
      onSubmit(selectedScore, feedback)
    }
  }

  const handleDismiss = () => {
    onDismiss()
    onClose()
  }

  const getScoreColor = (score: number) => {
    if (score <= 6) return 'bg-red-500 text-white'
    if (score <= 8) return 'bg-amber-500 text-white'
    return 'bg-emerald-500 text-white'
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={handleDismiss}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-[480px] bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 transition-all duration-200 ${
          isVisible ? 'scale-100' : 'scale-95'
        }`}
      >
        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          aria-label="Close survey"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            How likely are you to recommend
          </h2>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">
            LeadFlow AI to another agent?
          </p>
        </div>

        {/* NPS Scale */}
        <div className="mb-6">
          <div className="flex justify-center gap-2 mb-2">
            {Array.from({ length: 11 }, (_, i) => {
              const score = i
              const isSelected = selectedScore === score
              const isDetractor = score <= 6
              const isPassive = score >= 7 && score <= 8
              const isPromoter = score >= 9

              return (
                <button
                  key={score}
                  onClick={() => handleScoreSelect(score)}
                  className={`w-11 h-11 rounded-lg font-medium text-sm transition-all duration-150 ${
                    isSelected
                      ? getScoreColor(score) + ' scale-110'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                  aria-pressed={isSelected}
                  aria-label={`Score ${score}`}
                >
                  {score}
                </button>
              )
            })}
          </div>
          <div className="flex justify-between text-xs text-slate-500 px-1">
            <span>Not likely</span>
            <span>Very likely</span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-200 dark:border-slate-800 my-6" />

        {/* Open Text Feedback */}
        <div className="mb-6">
          <label
            htmlFor="nps-feedback"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
          >
            What's the #1 thing we could improve?{' '}
            <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="nps-feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            maxLength={500}
            placeholder="Tell us what would make LeadFlow better for you..."
            className="w-full min-h-[80px] p-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none transition-colors"
          />
          <div className="text-right text-xs text-slate-400 mt-1">
            {feedback.length} / 500
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={handleDismiss}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            Ask me later
          </button>
          <button
            onClick={handleSubmit}
            disabled={selectedScore === null}
            className={`px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors ${
              selectedScore === null ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  )
}

// Example usage:
// <NPSSurveyModal
//   isOpen={showSurvey}
//   onClose={() => setShowSurvey(false)}
//   onSubmit={(score, feedback) => {
//     console.log('NPS:', score, 'Feedback:', feedback)
//     // Submit to API
//   }}
//   onDismiss={() => {
//     console.log('Survey dismissed')
//     // Record dismissal, suppress for 30 days
//   }}
// />
