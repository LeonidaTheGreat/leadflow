'use client'

/**
 * UC-8: Follow-up Sequences - SequenceStatusCard
 * Displays active/paused sequences for a lead with pause/resume controls.
 */

import { useState } from 'react'
import type { LeadSequence, SequenceType, SequenceStatus } from '@/lib/types/sequences'

interface SequenceStatusCardProps {
  sequences: LeadSequence[]
  leadId: string
}

const SEQUENCE_TYPE_LABELS: Record<SequenceType, string> = {
  no_response: 'No Response',
  post_viewing: 'Post Viewing',
  no_show: 'No Show',
  nurture: 'Nurture',
}

const STATUS_STYLES: Record<SequenceStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  paused: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  completed: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

interface SequenceRowProps {
  sequence: LeadSequence
}

function SequenceRow({ sequence }: SequenceRowProps) {
  const [status, setStatus] = useState<SequenceStatus>(sequence.status)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const remaining = (sequence.max_messages ?? 3) - sequence.total_messages_sent

  async function handleToggle() {
    setLoading(true)
    setError(null)
    const action = status === 'active' ? 'pause' : 'resume'
    try {
      const res = await fetch(`/api/sequences/${sequence.id}/${action}`, {
        method: 'POST',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error ?? `Failed to ${action} sequence`)
      }
      setStatus(action === 'pause' ? 'paused' : 'active')
    } catch (err: any) {
      setError(err?.message ?? 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const canToggle = status === 'active' || status === 'paused'

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-md p-3 space-y-2">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-sm text-slate-900 dark:text-white">
          {SEQUENCE_TYPE_LABELS[sequence.sequence_type] ?? sequence.sequence_type}
        </span>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[status]}`}
          aria-label={`Sequence status: ${status}`}
        >
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>

      {/* Step / progress */}
      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span>Step {sequence.step}</span>
        <span>·</span>
        <span>{sequence.total_messages_sent} sent</span>
        <span>·</span>
        <span>{remaining > 0 ? `${remaining} remaining` : 'Complete'}</span>
      </div>

      {/* Timing */}
      <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
        {sequence.last_sent_at && (
          <div className="flex justify-between">
            <span>Last sent</span>
            <span className="text-slate-700 dark:text-slate-300">{formatDate(sequence.last_sent_at)}</span>
          </div>
        )}
        {status !== 'completed' && sequence.next_send_at && (
          <div className="flex justify-between">
            <span>Next send</span>
            <span className="text-slate-700 dark:text-slate-300">{formatDate(sequence.next_send_at)}</span>
          </div>
        )}
      </div>

      {/* Pause / Resume button */}
      {canToggle && (
        <button
          onClick={handleToggle}
          disabled={loading}
          aria-label={status === 'active' ? 'Pause sequence' : 'Resume sequence'}
          className={`mt-1 w-full text-xs font-medium px-3 py-1.5 rounded transition-colors disabled:opacity-50 ${
            status === 'active'
              ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:hover:bg-amber-900/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
          }`}
        >
          {loading ? 'Updating…' : status === 'active' ? 'Pause Sequence' : 'Resume Sequence'}
        </button>
      )}

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export function SequenceStatusCard({ sequences, leadId }: SequenceStatusCardProps) {
  // Show active/paused sequences first, then completed
  const visible = sequences.filter(
    (s) => s.status === 'active' || s.status === 'paused'
  )
  const completed = sequences.filter((s) => s.status === 'completed')

  if (sequences.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Follow-up Sequences</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">No sequences active for this lead.</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
      <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Follow-up Sequences</h3>

      <div className="space-y-3">
        {visible.map((seq) => (
          <SequenceRow key={seq.id} sequence={seq} />
        ))}

        {completed.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 select-none">
              {completed.length} completed sequence{completed.length !== 1 ? 's' : ''}
            </summary>
            <div className="mt-2 space-y-2 opacity-60">
              {completed.map((seq) => (
                <SequenceRow key={seq.id} sequence={seq} />
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}
