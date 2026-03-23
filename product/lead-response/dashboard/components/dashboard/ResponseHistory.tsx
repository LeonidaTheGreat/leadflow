'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Bot, User, MessageSquare, CheckCircle, XCircle, Clock } from 'lucide-react'
import type { Message, Lead } from '@/lib/types'

interface MessageWithLead extends Message {
  lead: Lead
}

function getCurrentUserId(): string | null {
  try {
    const raw = localStorage.getItem('leadflow_user') || sessionStorage.getItem('leadflow_user')
    if (!raw) return null
    const user = JSON.parse(raw)
    return user?.id || null
  } catch {
    return null
  }
}

export function ResponseHistory() {
  const [messages, setMessages] = useState<MessageWithLead[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'outbound' | 'inbound'>('all')

  useEffect(() => {
    fetchMessages()
  }, [filter])

  async function fetchMessages() {
    try {
      setLoading(true)

      const userId = getCurrentUserId()
      if (!userId) return

      let query = supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (filter !== 'all') {
        query = query.eq('direction', filter)
      }

      const { data, error } = await query

      if (error) throw error
      setMessages(data || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="p-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-48 mb-2"></div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Message History ({messages.length})
        </h2>
        <select 
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="text-sm px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        >
          <option value="all">All Messages</option>
          <option value="outbound">Outbound Only</option>
          <option value="inbound">Inbound Only</option>
        </select>
      </div>

      {messages.length === 0 ? (
        <div className="p-8 text-center text-slate-500 dark:text-slate-400">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No messages found</p>
          <p className="text-sm mt-1">Messages will appear here once conversations start</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {messages.map((message) => (
            <MessageRow key={message.id} message={message} />
          ))}
        </div>
      )}
    </div>
  )
}

function MessageRow({ message }: { message: MessageWithLead }) {
  const isOutbound = message.direction === 'outbound'
  const isAiGenerated = message.ai_generated
  
  const statusIcons = {
    pending: <Clock className="w-3 h-3 text-amber-500" />,
    sent: <CheckCircle className="w-3 h-3 text-emerald-500" />,
    delivered: <CheckCircle className="w-3 h-3 text-emerald-600" />,
    failed: <XCircle className="w-3 h-3 text-red-500" />,
    read: <CheckCircle className="w-3 h-3 text-blue-500" />,
  }

  const formattedDate = new Date(message.created_at).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      <div className="flex items-start gap-4">
        {/* Direction Icon */}
        <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
          isOutbound 
            ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
        }`}>
          {isOutbound ? (
            isAiGenerated ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />
          ) : (
            <User className="w-4 h-4" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-900 dark:text-white">
                {message.lead.name || 'Unknown'}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                isOutbound 
                  ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200'
                  : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
              }`}>
                {isOutbound ? 'Sent' : 'Received'}
              </span>
              {isAiGenerated && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                  AI
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{formattedDate}</span>
              {message.status && statusIcons[message.status as keyof typeof statusIcons]}
            </div>
          </div>

          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
            {message.message_body}
          </p>

          {/* Meta */}
          <div className="mt-2 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span>{formatPhone(message.lead.phone)}</span>
            {message.ai_confidence && (
              <span>AI Confidence: {Math.round(message.ai_confidence * 100)}%</span>
            )}
            {message.twilio_sid && (
              <span className="font-mono">SID: {message.twilio_sid.slice(0, 20)}...</span>
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
