'use client'

import { useState } from 'react'
import { MessageSquare, X, Send, Loader2, CheckCircle } from 'lucide-react'

type FeedbackType = 'praise' | 'bug' | 'idea' | 'frustration'

const feedbackTypes: { type: FeedbackType; label: string; emoji: string }[] = [
  { type: 'praise', label: 'Works great', emoji: '👍' },
  { type: 'bug', label: 'Bug', emoji: '🐛' },
  { type: 'idea', label: 'Idea', emoji: '💡' },
  { type: 'frustration', label: 'Frustration', emoji: '😤' },
]

export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<FeedbackType | null>(null)
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!selectedType || !content.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedbackType: selectedType,
          content: content.trim(),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit feedback')
      }

      setSubmitted(true)
      setTimeout(() => {
        setIsOpen(false)
        setSubmitted(false)
        setSelectedType(null)
        setContent('')
      }, 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 z-50"
      >
        <MessageSquare className="w-5 h-5" />
        <span className="font-medium text-sm">Give Feedback</span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Send Feedback
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              {submitted ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    Thank You!
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    We read every submission.
                  </p>
                </div>
              ) : (
                <>
                  {/* Feedback Type Selection */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {feedbackTypes.map((type) => (
                      <button
                        key={type.type}
                        onClick={() => setSelectedType(type.type)}
                        className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                          selectedType === type.type
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <span className="text-xl">{type.emoji}</span>
                        <span className={`text-sm font-medium ${
                          selectedType === type.type
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}>
                          {type.label}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Text Area */}
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Tell us more about your experience..."
                    maxLength={500}
                    rows={4}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none text-slate-900 dark:text-white placeholder-slate-400"
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-slate-400">
                      {content.length}/500
                    </span>
                  </div>

                  {/* Error */}
                  {error && (
                    <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                      {error}
                    </p>
                  )}

                  {/* Submit Button */}
                  <button
                    onClick={handleSubmit}
                    disabled={!selectedType || !content.trim() || isSubmitting}
                    className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Send Feedback
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
