'use client'

import { useState } from 'react'
import { Send, Sparkles, Loader2, AlertCircle } from 'lucide-react'

interface SmsComposerProps {
  leadId: string
  leadName?: string
  consentSms: boolean
  dnc: boolean
  onSend: (message: string, aiGenerated: boolean) => Promise<void>
  className?: string
}

export function SmsComposer({ 
  leadId, 
  leadName = 'Lead', 
  consentSms, 
  dnc, 
  onSend,
  className = '' 
}: SmsComposerProps) {
  const [message, setMessage] = useState('')
  const [isAiGenerating, setIsAiGenerating] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null)

  const charCount = message.length
  const charLimit = 160
  const charsRemaining = charLimit - charCount
  const isOverLimit = charCount > charLimit

  // Check if can send
  const canSend = !dnc && consentSms && message.trim().length > 0 && !isOverLimit

  // Handle AI Assist
  const handleAiAssist = async () => {
    setIsAiGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/sms/ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate AI suggestion')
      }

      const data = await response.json()
      setMessage(data.message)
      setAiSuggestion(data.message)
    } catch (err: any) {
      setError(err.message || 'Failed to generate suggestion')
    } finally {
      setIsAiGenerating(false)
    }
  }

  // Handle Send
  const handleSend = async () => {
    if (!canSend || isSending) return

    setIsSending(true)
    setError(null)

    try {
      await onSend(message, !!aiSuggestion)
      setMessage('')
      setAiSuggestion(null)
    } catch (err: any) {
      setError(err.message || 'Failed to send message')
    } finally {
      setIsSending(false)
    }
  }

  // Handle key press (Cmd+Enter or Ctrl+Enter to send)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canSend) {
      handleSend()
    }
  }

  // Compliance check UI
  if (dnc) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">Cannot send SMS - Lead is on Do Not Contact list</span>
        </div>
      </div>
    )
  }

  if (!consentSms) {
    return (
      <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 text-yellow-700">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">Cannot send SMS - Lead has not consented to SMS</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Text Input */}
      <div className="relative">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={`Type message to ${leadName}...`}
          disabled={isSending || isAiGenerating}
          className={`
            w-full px-4 py-3 pr-16 rounded-lg border resize-none
            focus:outline-none focus:ring-2 focus:ring-blue-500
            ${isOverLimit ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'}
            ${(isSending || isAiGenerating) ? 'bg-gray-50 cursor-not-allowed' : ''}
          `}
          rows={3}
        />
        
        {/* Character Counter */}
        <div className={`
          absolute bottom-2 right-2 text-xs font-medium
          ${isOverLimit ? 'text-red-600' : charsRemaining < 20 ? 'text-yellow-600' : 'text-gray-500'}
        `}>
          {charsRemaining}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {/* AI Assist Button */}
        <button
          onClick={handleAiAssist}
          disabled={isAiGenerating || isSending}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
            transition-colors
            ${isAiGenerating || isSending
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
            }
          `}
        >
          {isAiGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>AI Assist</span>
            </>
          )}
        </button>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!canSend || isSending}
          className={`
            flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium
            transition-colors
            ${!canSend || isSending
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
            }
          `}
        >
          {isSending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Sending...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Send</span>
            </>
          )}
        </button>

        {/* Keyboard Shortcut Hint */}
        {canSend && !isSending && (
          <span className="text-xs text-gray-500 ml-auto">
            {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Enter to send
          </span>
        )}
      </div>

      {/* AI Suggestion Indicator */}
      {aiSuggestion && message === aiSuggestion && (
        <div className="text-xs text-purple-600 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          <span>AI-generated suggestion - you can edit before sending</span>
        </div>
      )}
    </div>
  )
}
