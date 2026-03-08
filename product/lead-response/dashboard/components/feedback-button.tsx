/**
 * Feedback Button Component
 * Persistent feedback button for dashboard
 * feat-nps-agent-feedback
 */

'use client'

import { useState } from 'react'
import { MessageSquare, X, ThumbsUp, Bug, Lightbulb, AlertCircle } from 'lucide-react'

interface FeedbackButtonProps {
  agentId: string
  authToken: string
}

type FeedbackType = 'praise' | 'bug' | 'idea' | 'frustration'

const FEEDBACK_TYPES: { type: FeedbackType; label: string; icon: React.ReactNode; color: string }[] = [
  { type: 'praise', label: 'Works great', icon: <ThumbsUp className="h-4 w-4" />, color: 'bg-green-100 text-green-700 hover:bg-green-200' },
  { type: 'bug', label: 'Bug', icon: <Bug className="h-4 w-4" />, color: 'bg-red-100 text-red-700 hover:bg-red-200' },
  { type: 'idea', label: 'Idea', icon: <Lightbulb className="h-4 w-4" />, color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
  { type: 'frustration', label: 'Frustration', icon: <AlertCircle className="h-4 w-4" />, color: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
]

export function FeedbackButton({ agentId, authToken }: FeedbackButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<FeedbackType | null>(null)
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!selectedType || !content.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feedbackType: selectedType,
          content: content.trim(),
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setIsSubmitted(true)
        setTimeout(() => {
          setIsOpen(false)
          setIsSubmitted(false)
          setSelectedType(null)
          setContent('')
        }, 2000)
      } else {
        setError(data.error || 'Failed to submit feedback')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setSelectedType(null)
    setContent('')
    setError(null)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 flex items-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg transition-all hover:bg-slate-800 hover:shadow-xl"
      >
        <MessageSquare className="h-4 w-4" />
        <span>Give Feedback</span>
      </button>
    )
  }

  if (isSubmitted) {
    return (
      <div className="fixed bottom-6 right-6 z-50 w-80 rounded-lg bg-white p-4 shadow-xl">
        <div className="text-center">
          <div className="mb-2 flex justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <ThumbsUp className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <p className="font-medium text-gray-900">Thanks!</p>
          <p className="text-sm text-gray-600">We read every submission.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 rounded-lg bg-white p-4 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Send Feedback</h3>
        <button
          onClick={handleClose}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {!selectedType ? (
        <div className="grid grid-cols-2 gap-2">
          {FEEDBACK_TYPES.map((type) => (
            <button
              key={type.type}
              onClick={() => setSelectedType(type.type)}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${type.color}`}
            >
              {type.icon}
              {type.label}
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="mb-3 flex items-center gap-2">
            <button
              onClick={() => setSelectedType(null)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Back
            </button>
            <span className="text-sm font-medium text-gray-700">
              {FEEDBACK_TYPES.find(t => t.type === selectedType)?.label}
            </span>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Tell us more..."
            maxLength={500}
            rows={4}
            className="mb-3 w-full rounded-md border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoFocus
          />

          <div className="mb-3 flex justify-between text-xs text-gray-500">
            <span>{content.length}/500</span>
          </div>

          {error && (
            <div className="mb-3 rounded-md bg-red-50 p-2 text-xs text-red-600">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleClose}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || content.trim().length < 5}
              className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Sending...' : 'Send'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
