'use client'

import { useState, useEffect } from 'react'
import { Phone } from 'lucide-react'
import { formatPhone } from '@/lib/utils'
import { MessageThread } from '@/components/message-thread'
import { SmsComposer } from '@/components/sms-composer'
import type { Lead, Message, Agent } from '@/lib/types'

interface ConversationViewV2Props {
  lead: Lead
  messages: Message[]
  agent: Agent | null
}

export function ConversationViewV2({ lead, messages: initialMessages, agent }: ConversationViewV2Props) {
  const [messages, setMessages] = useState(initialMessages)
  const [refreshing, setRefreshing] = useState(false)

  // Handle send message
  const handleSend = async (messageBody: string, aiGenerated: boolean) => {
    try {
      const response = await fetch('/api/sms/send-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: lead.id,
          message_body: messageBody,
          ai_assist: aiGenerated,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send message')
      }

      // Refresh messages after successful send
      await refreshMessages()
    } catch (error: any) {
      console.error('Send error:', error)
      throw error
    }
  }

  // Refresh messages from server
  const refreshMessages = async () => {
    setRefreshing(true)
    try {
      const response = await fetch(`/api/leads/${lead.id}/messages`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages)
      }
    } catch (error) {
      console.error('Failed to refresh messages:', error)
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-col h-[700px]">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-semibold">
              {lead.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??'}
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {lead.name || 'Unknown'}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {formatPhone(lead.phone)}
              </p>
            </div>
          </div>
          <a
            href={`tel:${lead.phone}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-md transition-colors"
          >
            <Phone className="w-4 h-4" />
            Call
          </a>
        </div>
      </div>

      {/* Messages - UC7-M2 */}
      <div className="flex-1 overflow-hidden">
        <MessageThread 
          messages={messages} 
          loading={refreshing}
          className="h-full"
        />
      </div>

      {/* Composer - UC7-M3 */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <SmsComposer
          leadId={lead.id}
          leadName={lead.name || 'Lead'}
          consentSms={lead.consent_sms}
          dnc={lead.dnc}
          onSend={handleSend}
        />
      </div>
    </div>
  )
}
