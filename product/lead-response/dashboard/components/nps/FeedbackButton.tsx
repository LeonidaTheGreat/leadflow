'use client'

/**
 * Feedback Button Component
 * 
 * Design Reference: /docs/DESIGN-NPS-AGENT-FEEDBACK.md
 * 
 * Persistent floating button for agent feedback submission.
 * This is a DESIGN MOCKUP / REFERENCE IMPLEMENTATION.
 */

import { useState, useRef, useEffect } from 'react'
import {
  MessageSquare,
  X,
  ThumbsUp,
  Bug,
  Lightbulb,
  Frown,
  CheckCircle,
} from 'lucide-react'

type FeedbackType = 'praise' | 'bug' | 'idea' | 'frustration'

interface FeedbackButtonProps {
  onSubmit: (type: FeedbackType, message: string) => void
}

const FEEDBACK_TYPES: { type: FeedbackType; label: string; icon: typeof ThumbsUp; color: string }[] = [
  { type: 'praise', label: 'Works great', icon: ThumbsUp, color: 'text-emerald-500' },
  { type: 'bug', label: 'Bug', icon: Bug, color: 'text-red-500' },
  { type: 'idea', label: 'Idea', icon: Lightbulb, color: 'text-amber-500' },
  { type: 'frustration', label: 'Frustration', icon: Frown, color: 'text-orange-500' },
]

export function FeedbackButton({ onSubmit }: FeedbackButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedType, setSelectedType] = useState<FeedbackType | null>(null)
  const [message, setMessage] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        if (!isSubmitted) {
          setIsExpanded(false)
        }
      }
    }

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isExpanded, isSubmitted])

  // Auto-collapse after success
  useEffect(() => {
    if (isSubmitted) {
      const timer = setTimeout(() => {
        setIsExpanded(false)
        setIsSubmitted(false)
        setSelectedType(null)
        setMessage('')
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isSubmitted])

  const handleSubmit = () => {
    if (selectedType && message.trim()) {
      onSubmit(selectedType, message.trim())
      setIsSubmitted(true)
    }
  }

  const handleClose = () => {
    setIsExpanded(false)
    setSelectedType(null)
    setMessage('')
    setIsSubmitted(false)
  }

  return (
    <div ref={panelRef} className="fixed right-6 bottom-6 z-40">
      {/* Expanded Panel */}
      {isExpanded && (
        <div className="absolute bottom-16 right-0 w-80 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-900 dark:text-white">
                Give Feedback
              </span>
            </div>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              aria-label="Close feedback"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Success State */}
          {isSubmitted ? (
            <div className="p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-emerald-500 animate-in zoom-in duration-300" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
                Thanks for your feedback!
              </h3>
              <p className="text-sm text-slate-500">
                We read every submission.
              </p>
            </div>
          ) : (
            <>
              {/* Content */}
              <div className="p-4">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  How's your experience?
                </p>

                {/* Feedback Type Grid */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {FEEDBACK_TYPES.map(({ type, label, icon: Icon, color }) => (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all ${
                        selectedType === type
                          ? 'border-emerald-500 ring-2 ring-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${color}`} />
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {label}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Message Input */}
                <div>
                  <label
                    htmlFor="feedback-message"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5"
                  >
                    Tell us more:
                  </label>
                  <textarea
                    id="feedback-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={500}
                    placeholder="What's on your mind?"
                    className="w-full min-h-[72px] p-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                  />
                  <div className="text-right text-xs text-slate-400 mt-1">
                    {message.length} / 500
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="px-4 pb-4">
                <button
                  onClick={handleSubmit}
                  disabled={!selectedType || !message.trim()}
                  className={`w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors ${
                    !selectedType || !message.trim()
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
                >
                  Submit Feedback
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Collapsed Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2 px-4 py-3 rounded-full font-medium text-sm shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 ${
          isExpanded
            ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
        }`}
        aria-label={isExpanded ? 'Close feedback' : 'Give feedback'}
      >
        <MessageSquare className="w-[18px] h-[18px]" />
        <span>Give Feedback</span>
      </button>
    </div>
  )
}

// Example usage:
// <FeedbackButton
//   onSubmit={(type, message) => {
//     console.log('Feedback:', type, message)
//     // Submit to /api/feedback endpoint
//   }}
// />
