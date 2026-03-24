'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { LeadCard } from './LeadCard'
import type { Lead } from '@/lib/types'

// ─── Sample lead type (extends Lead with demo fields) ─────────────────────────

interface SampleLead extends Lead {
  is_sample: true
  ai_drafted_response: string
}

// ─── Sample leads banner ───────────────────────────────────────────────────────

function SampleLeadsBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 p-4 flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🎯</span>
          <p className="font-semibold text-amber-900 dark:text-amber-100">
            These are sample leads — here's what LeadFlow looks like in action
          </p>
        </div>
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Connect your Follow Up Boss account or send a test lead to see your real leads here.
          AI-drafted responses are generated automatically within 30 seconds of a new lead coming in.
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 text-lg leading-none"
        aria-label="Dismiss sample leads banner"
      >
        ×
      </button>
    </div>
  )
}

// ─── AI drafted response preview card ─────────────────────────────────────────

function AiResponsePreview({ response }: { response: string }) {
  return (
    <div className="mx-4 mb-3 rounded-md border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wide">
          ✨ AI-drafted SMS response
        </span>
      </div>
      <p className="text-sm text-emerald-900 dark:text-emerald-100 leading-relaxed">
        {response}
      </p>
    </div>
  )
}

// ─── Sample lead card wrapper ──────────────────────────────────────────────────

function SampleLeadCard({ lead }: { lead: SampleLead }) {
  const [expanded, setExpanded] = useState(false)

  const statusColors: Record<string, string> = {
    new: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    qualified: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
    responded: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    nurturing: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    appointment: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  }

  const initials = lead.name
    ? lead.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??'

  const formattedDate = new Date(lead.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="border-b border-slate-200 dark:border-slate-800 last:border-0">
      <button
        className="w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
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
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                    {lead.name}
                  </h3>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 uppercase tracking-wide">
                    DEMO
                  </span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {lead.source}
                  {lead.location ? ` · ${lead.location}` : ''}
                </p>
              </div>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  statusColors[lead.status] || statusColors.new
                }`}
              >
                {lead.status}
              </span>
            </div>

            {/* Last message preview */}
            {lead.last_message && (
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 line-clamp-1">
                {lead.last_message}
              </p>
            )}

            {/* Footer */}
            <div className="mt-2 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-500">
              <span>{formattedDate}</span>
              {lead.message_count !== undefined && (
                <span>{lead.message_count} message{lead.message_count !== 1 ? 's' : ''}</span>
              )}
              {lead.latest_qualification?.is_qualified && (
                <span className="text-emerald-600 dark:text-emerald-400">AI Qualified</span>
              )}
              {lead.urgency_score && (
                <span>Urgency: {lead.urgency_score}/100</span>
              )}
            </div>
          </div>

          {/* Expand chevron */}
          <span className="text-slate-400 text-sm flex-shrink-0 mt-1">
            {expanded ? '▲' : '▼'}
          </span>
        </div>
      </button>

      {/* AI-drafted response — shown on expand */}
      {expanded && (
        <AiResponsePreview response={lead.ai_drafted_response} />
      )}
    </div>
  )
}

// ─── Main LeadFeed component ───────────────────────────────────────────────────

export function LeadFeed() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [sampleLeads, setSampleLeads] = useState<SampleLead[]>([])
  const [showSampleBanner, setShowSampleBanner] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    // Fetch real leads + (in parallel) check for sample leads eligibility
    fetchLeads()
    checkSampleLeads()

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        fetchLeads()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  async function fetchLeads() {
    try {
      setLoading(true)

      let query = supabase
        .from('lead_summary')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query

      if (error) throw error
      setLeads(data || [])
    } catch (error) {
      console.error('Error fetching leads:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Call /api/sample-leads to check if the current user is on their first session
   * (onboarding_completed = false). If so, load 3 demo leads.
   *
   * Failures are swallowed — sample leads are strictly additive.
   */
  async function checkSampleLeads() {
    try {
      const res = await fetch('/api/sample-leads', { credentials: 'include' })
      if (!res.ok) return
      const json = await res.json()
      if (json.eligible && Array.isArray(json.leads) && json.leads.length > 0) {
        setSampleLeads(json.leads as SampleLead[])
        setShowSampleBanner(true)
        // Track sample_data_rendered event (FR-8)
        void fetch('/api/events/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            event: 'sample_data_rendered',
            properties: { count: json.leads.length },
          }),
        }).catch(() => { /* non-blocking */ })
      }
    } catch (err) {
      // Non-critical — sample leads are optional
      console.warn('[LeadFeed] sample-leads check failed:', err)
    }
  }

  // ─── Loading skeleton ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-32 animate-pulse"></div>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32 mb-2"></div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-48"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ─── Determine what to show ────────────────────────────────────────────────

  const hasRealLeads = leads.length > 0
  // Show sample leads only when: user is eligible AND there are no real leads yet
  const showSamples = sampleLeads.length > 0 && !hasRealLeads

  const totalDisplayed = hasRealLeads ? leads.length : (showSamples ? sampleLeads.length : 0)
  const label = showSamples ? `${sampleLeads.length} sample leads` : `Recent Leads (${totalDisplayed})`

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Sample leads explainer banner */}
      {showSamples && showSampleBanner && (
        <SampleLeadsBanner onDismiss={() => setShowSampleBanner(false)} />
      )}

      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {label}
          </h2>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-sm px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="qualified">Qualified</option>
            <option value="responded">Responded</option>
            <option value="nurturing">Nurturing</option>
            <option value="appointment">Appointment</option>
          </select>
        </div>

        {/* Sample leads (no real leads yet) */}
        {showSamples && (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {sampleLeads.map((lead) => (
              <SampleLeadCard key={lead.id} lead={lead} />
            ))}
          </div>
        )}

        {/* Real leads */}
        {hasRealLeads && (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {leads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
          </div>
        )}

        {/* Empty state — no real leads and not eligible for samples */}
        {!hasRealLeads && !showSamples && (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">
            <p>No leads found</p>
            <p className="text-sm mt-1">New leads will appear here when they come in</p>
          </div>
        )}
      </div>
    </div>
  )
}
