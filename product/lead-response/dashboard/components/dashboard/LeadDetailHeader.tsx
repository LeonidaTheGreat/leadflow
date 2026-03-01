import Link from 'next/link'
import { ArrowLeft, Phone, Mail, MapPin, Calendar } from 'lucide-react'
import type { Lead } from '@/lib/types'

interface LeadDetailHeaderProps {
  lead: Lead
}

export function LeadDetailHeader({ lead }: LeadDetailHeaderProps) {
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
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Link 
          href="/dashboard"
          className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <span className="text-sm text-slate-500 dark:text-slate-400">Back to leads</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xl font-bold">
            {lead.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??'}
          </div>
          
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {lead.name || 'Unknown Name'}
            </h1>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Phone className="w-4 h-4" />
                {formatPhone(lead.phone)}
              </span>
              {lead.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {lead.email}
                </span>
              )}
              {lead.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {lead.location}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Added {formattedDate}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[lead.status] || statusColors.new}`}>
            {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
          </span>
          
          {lead.consent_sms && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
              SMS Consent
            </span>
          )}
          
          {lead.dnc && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
              DNC
            </span>
          )}
        </div>
      </div>

      {/* Source & Budget */}
      <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Source</p>
          <p className="font-medium text-slate-900 dark:text-white capitalize">{lead.source}</p>
        </div>
        {lead.budget_min && (
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Budget Min</p>
            <p className="font-medium text-slate-900 dark:text-white">
              ${lead.budget_min.toLocaleString()}
            </p>
          </div>
        )}
        {lead.budget_max && (
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Budget Max</p>
            <p className="font-medium text-slate-900 dark:text-white">
              ${lead.budget_max.toLocaleString()}
            </p>
          </div>
        )}
        {lead.timeline && (
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Timeline</p>
            <p className="font-medium text-slate-900 dark:text-white capitalize">
              {lead.timeline.replace(/-/g, ' ')}
            </p>
          </div>
        )}
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
