'use client'

import Link from 'next/link'
import { Phone, Mail, MapPin, Clock, MessageSquare } from 'lucide-react'
import type { Lead } from '@/lib/types'

interface LeadCardProps {
  lead: Lead
}

export function LeadCard({ lead }: LeadCardProps) {
  const statusColors: Record<string, string> = {
    new: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    qualified: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
    responded: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    nurturing: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    appointment: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    closed: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
    dnc: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  }

  const formattedDate = new Date(lead.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const initials = lead.name 
    ? lead.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??'

  return (
    <Link 
      href={`/dashboard/leads/${lead.id}`}
      className="block p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-semibold text-sm">
            {initials}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                {lead.name || 'Unknown Name'}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {lead.source}
              </p>
            </div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[lead.status] || statusColors.new}`}>
              {lead.status}
            </span>
          </div>

          {/* Details */}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
            {lead.phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" />
                {formatPhone(lead.phone)}
              </span>
            )}
            {lead.email && (
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                <span className="truncate max-w-[150px]">{lead.email}</span>
              </span>
            )}
            {lead.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {lead.location}
              </span>
            )}
            {lead.latest_qualification?.intent && (
              <span className="flex items-center gap-1 capitalize">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                {lead.latest_qualification.intent}
              </span>
            )}
          </div>

          {/* Footer */}
          <div className="mt-2 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formattedDate}
            </span>
            {lead.message_count !== undefined && (
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {lead.message_count} messages
              </span>
            )}
            {lead.latest_qualification?.confidence_score && (
              <span className="flex items-center gap-1">
                <span className="text-emerald-600 dark:text-emerald-400">
                  {Math.round(lead.latest_qualification.confidence_score * 100)}% confidence
                </span>
              </span>
            )}
          </div>
        </div>

        {/* AI Qualified Badge */}
        {lead.latest_qualification?.is_qualified && (
          <div className="flex-shrink-0">
            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
              AI Qualified
            </span>
          </div>
        )}
      </div>
    </Link>
  )
}

function formatPhone(phone: string): string {
  // Format E.164 to readable format
  if (phone.startsWith('+1') && phone.length === 12) {
    return `(${phone.slice(2, 5)}) ${phone.slice(5, 8)}-${phone.slice(8)}`
  }
  return phone
}
