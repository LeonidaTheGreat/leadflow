'use client'

import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { CheckCircle2, Circle, AlertCircle, Bot, User } from 'lucide-react'
import type { Message } from '@/lib/types'

interface MessageThreadProps {
  messages: Message[]
  loading?: boolean
  className?: string
}

export function MessageThread({ messages, loading = false, className = '' }: MessageThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  // Auto-scroll to latest message
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, autoScroll])

  const getStatusIcon = (message: Message) => {
    if (message.direction === 'inbound') return null

    switch (message.status) {
      case 'delivered':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'sent':
        return <CheckCircle2 className="w-4 h-4 text-blue-500" />
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return <Circle className="w-4 h-4 text-gray-400" />
    }
  }

  const getMessageColorClass = (message: Message) => {
    if (message.direction === 'inbound') {
      return 'bg-gray-100 text-gray-900 border-gray-200'
    }
    
    if (message.ai_generated) {
      return 'bg-purple-50 text-purple-900 border-purple-200'
    }
    
    return 'bg-blue-50 text-blue-900 border-blue-200'
  }

  const getTimestamp = (message: Message) => {
    const timestamp = message.sent_at || message.created_at
    return format(new Date(timestamp), 'MMM d, h:mm a')
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-gray-500">Loading messages...</div>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-gray-500 text-center">
          <p className="text-lg">No messages yet</p>
          <p className="text-sm mt-2">Send the first message to start the conversation</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full overflow-y-auto space-y-4 p-4 ${className}`}>
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.direction === 'inbound' ? 'justify-start' : 'justify-end'}`}
        >
          <div
            className={`
              max-w-[75%] rounded-lg border px-4 py-3 shadow-sm
              ${getMessageColorClass(message)}
            `}
          >
            {/* Message Header */}
            <div className="flex items-center gap-2 mb-2">
              {message.direction === 'inbound' ? (
                <User className="w-4 h-4" />
              ) : message.ai_generated ? (
                <Bot className="w-4 h-4" />
              ) : (
                <User className="w-4 h-4" />
              )}
              
              <span className="text-xs font-medium">
                {message.direction === 'inbound' ? 'Lead' : message.ai_generated ? 'AI Agent' : 'Agent'}
              </span>
              
              {message.ai_generated && message.ai_confidence && (
                <span className="text-xs text-gray-600">
                  ({Math.round(message.ai_confidence * 100)}% confidence)
                </span>
              )}
            </div>

            {/* Message Body */}
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.message_body}
            </div>

            {/* Message Footer */}
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
              <span>{getTimestamp(message)}</span>
              {getStatusIcon(message)}
              {message.status === 'failed' && (
                <span className="text-red-600 font-medium">Failed</span>
              )}
            </div>
          </div>
        </div>
      ))}
      
      <div ref={messagesEndRef} />
    </div>
  )
}
