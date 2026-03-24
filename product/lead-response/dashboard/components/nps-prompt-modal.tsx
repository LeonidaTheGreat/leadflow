'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface NPSPromptModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (score: number, text?: string) => Promise<void>
  trigger?: 'auto_14d' | 'auto_90d'
}

/**
 * NPSPromptModal
 * Displays an in-app NPS survey prompt on dashboard login if conditions are met:
 * - A survey trigger has fired
 * - No response submitted within 7 days
 * - Not dismissed in the last 30 days
 */
export const NPSPromptModal: React.FC<NPSPromptModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  trigger = 'auto_14d',
}) => {
  const [selectedScore, setSelectedScore] = useState<number | null>(null)
  const [openText, setOpenText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleScoreClick = (score: number) => {
    setSelectedScore(score)
    setSubmitError(null)
  }

  const handleDismiss = async () => {
    try {
      const response = await fetch('/api/nps/dismiss', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trigger }),
      })

      if (!response.ok) {
        console.error('Failed to dismiss NPS prompt')
      }
    } catch (error) {
      console.error('Error dismissing NPS prompt:', error)
    } finally {
      onClose()
    }
  }

  const handleSubmitScore = async () => {
    if (selectedScore === null) {
      setSubmitError('Please select a score')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(selectedScore, openText || undefined)
      onClose()
    } catch (error: any) {
      setSubmitError(error.message || 'Failed to submit response')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">How are we doing?</h2>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Description */}
        <p className="text-gray-600 mb-6">
          We'd love to hear your feedback about LeadFlow AI. Your response helps us improve.
        </p>

        {/* Score Scale */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            How likely are you to recommend LeadFlow AI to a colleague?
          </label>
          <div className="grid grid-cols-10 gap-1">
            {Array.from({ length: 11 }, (_, i) => i).map((score) => (
              <button
                key={score}
                onClick={() => handleScoreClick(score)}
                className={`aspect-square text-sm font-semibold rounded transition-colors ${
                  selectedScore === score
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {score}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>Not likely</span>
            <span>Very likely</span>
          </div>
        </div>

        {/* Optional feedback text */}
        <div className="mb-6">
          <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-2">
            What could we improve? (optional)
          </label>
          <textarea
            id="feedback"
            value={openText}
            onChange={(e) => setOpenText(e.target.value)}
            placeholder="Tell us what's on your mind..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            rows={3}
            disabled={isSubmitting}
          />
        </div>

        {/* Error message */}
        {submitError && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded">
            {submitError}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={handleDismiss}
            variant="outline"
            className="flex-1"
            disabled={isSubmitting}
          >
            Skip for now
          </Button>
          <Button
            onClick={handleSubmitScore}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
            disabled={isSubmitting || selectedScore === null}
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        </div>
      </div>
    </div>
  )
}
