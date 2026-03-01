'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Phone, Bot, User, AlertCircle, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from '@/lib/utils'
import type { Lead, Message, Agent } from '@/lib/types'

interface ConversationViewProps {
  lead: Lead
  messages: Message[]
  agent: Agent | null
}

interface ErrorState {
  message: string;
  action?: string;
  code?: string;
  category?: string;
  retryable?: boolean;
}

export function ConversationView({ lead, messages, agent }: ConversationViewProps) {
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [error, setError] = useState<ErrorState | null>(null)
  const [aiDisabledUntil, setAiDisabledUntil] = useState<number>(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Disable AI button temporarily after timeout
  useEffect(() => {
    if (aiDisabledUntil > Date.now()) {
      const timer = setInterval(() => {
        setAiDisabledUntil(prev => {
          if (prev > Date.now()) return prev;
          return 0;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [aiDisabledUntil])

  // Check if lead has opted out
  const isOptedOut = lead.dnc || !lead.consent_sms;

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim() || sending || isOptedOut) return

    setError(null)
    setSending(true)

    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: lead.id,
          message: newMessage,
        }),
      })

      if (response.ok) {
        setNewMessage('')
        // Refresh page to show new message
        window.location.reload()
      } else {
        const errorData = await response.json()
        setError({
          message: errorData.error || 'Failed to send message',
          action: errorData.action,
          code: errorData.code,
          category: errorData.category,
          retryable: errorData.retryable,
        })
      }
    } catch (err) {
      console.error('Send error:', err)
      setError({
        message: 'Network error. Please check your connection and try again.',
        retryable: true,
      })
    } finally {
      setSending(false)
    }
  }

  async function handleAiSuggest() {
    if (aiLoading || isOptedOut) return;

    setError(null)
    setAiLoading(true)

    try {
      const response = await fetch('/api/sms/ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: lead.id }),
      })

      if (response.ok) {
        const data = await response.json()
        setNewMessage(data.message)
      } else {
        const errorData = await response.json()
        setError({
          message: errorData.error || 'Failed to generate suggestion',
          action: errorData.action,
          code: errorData.code,
          category: errorData.category,
          retryable: errorData.retryable,
        })

        // Disable AI button for 30 seconds on timeout
        if (errorData.code === 'AI_TIMEOUT') {
          setAiDisabledUntil(Date.now() + 30000);
        }
      }
    } catch (err) {
      console.error('AI suggest error:', err)
      setError({
        message: 'Failed to generate suggestion. Try again or type your own message.',
        retryable: true,
      })
    } finally {
      setAiLoading(false)
    }
  }

  async function handleAiReply() {
    await handleAiSuggest()
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-col h-screen md:h-[600px] max-h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="p-3 md:p-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
              {lead.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??'}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                {lead.name || 'Unknown'}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {formatPhone(lead.phone)}
              </p>
            </div>
          </div>
          
          {/* Status indicators */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isOptedOut && (
              <div className="px-3 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full text-xs font-medium">
                Opted Out
              </div>
            )}
            <a
              href={`tel:${lead.phone}`}
              className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-md transition-colors text-sm"
            >
              <Phone className="w-4 h-4" />
              <span className="hidden sm:inline">Call</span>
            </a>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <p>No messages yet</p>
            <p className="text-sm mt-1">
              {lead.responded_at 
                ? 'The lead was contacted via AI SMS'
                : 'Send a message to start the conversation'}
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error display */}
      {error && (
        <div className="px-3 md:px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-md mb-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                {error.message}
              </p>
              {error.action && (
                <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                  {error.action}
                </p>
              )}
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex-shrink-0"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 md:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0">
        <form onSubmit={handleSend} className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={isOptedOut ? "Lead has opted out" : "Type a message..."}
              className="flex-1 px-3 py-2 text-sm md:text-base rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={sending || isOptedOut}
            />
            
            {/* AI Button */}
            <button
              type="button"
              onClick={handleAiSuggest}
              disabled={aiLoading || sending || isOptedOut || aiDisabledUntil > Date.now()}
              className="px-3 md:px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors flex items-center gap-2 text-sm"
              title={
                aiDisabledUntil > Date.now() 
                  ? "AI button disabled after timeout (30s cooldown)" 
                  : "Generate AI suggestion"
              }
            >
              {aiLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">...</span>
                </>
              ) : (
                <>
                  <Bot className="w-4 h-4" />
                  <span className="hidden sm:inline">AI</span>
                </>
              )}
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={sending || !newMessage.trim() || isOptedOut}
              className="px-3 md:px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors flex items-center gap-2 text-sm"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Send</span>
                </>
              )}
            </button>
          </div>
          
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isOptedOut 
              ? "This lead has opted out and cannot receive SMS messages."
              : "Press Enter to send • Use AI button for smart reply"}
          </p>
        </form>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isOutbound = message.direction === 'outbound'
  const isFailed = message.status === 'failed'
  
  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'} max-w-full`}>
      <div className={`flex items-start gap-2 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg ${isOutbound ? 'flex-row-reverse' : ''}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
          isFailed
            ? 'bg-red-500 text-white'
            : isOutbound 
            ? 'bg-emerald-500 text-white' 
            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
        }`}>
          {isFailed ? (
            <AlertCircle className="w-4 h-4" />
          ) : isOutbound ? (
            <Bot className="w-4 h-4" />
          ) : (
            <User className="w-4 h-4" />
          )}
        </div>

        {/* Message */}
        <div className="min-w-0">
          <div className={`px-4 py-2 rounded-lg break-words ${
            isFailed
              ? 'bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-100'
              : isOutbound
              ? 'bg-emerald-500 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
          }`}>
            <p className="text-sm">{message.message_body}</p>
          </div>
          
          {/* Meta */}
          <div className={`flex items-center flex-wrap gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400 ${
            isOutbound ? 'justify-end' : ''
          }`}>
            <span>{formatDistanceToNow(new Date(message.created_at))}</span>
            {isOutbound && message.ai_generated && !isFailed && (
              <span className="flex items-center gap-1">
                <Bot className="w-3 h-3" />
                AI
              </span>
            )}
            {message.status && (
              <span className={`capitalize ${
                message.status === 'delivered' ? 'text-emerald-600 dark:text-emerald-400' : ''
              } ${isFailed ? 'text-red-600 dark:text-red-400 font-medium' : ''}`}>
                {isFailed ? 'Failed' : message.status}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function formatPhone(phone: string): string {
  if (phone.startsWith('+1') && phone.length === 12) {
    return `(${phone.slice(2, 5)}) ${phone.slice(5, 8)}-${phone.slice(8)}`
  }
  return phone
}
