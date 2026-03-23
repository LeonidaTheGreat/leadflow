'use client'

import { useEffect, useState } from 'react'
import { MessageSquare, Loader2 } from 'lucide-react'

interface SatisfactionPingToggleProps {
  agentId: string
}

export function SatisfactionPingToggle({ agentId }: SatisfactionPingToggleProps) {
  const [enabled, setEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!agentId) return
    fetchSetting()
  }, [agentId])

  async function fetchSetting() {
    try {
      const res = await fetch(`/api/agents/satisfaction-ping?agentId=${encodeURIComponent(agentId)}`)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setEnabled(data.satisfactionPingEnabled ?? true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleToggle() {
    const newEnabled = !enabled
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/agents/satisfaction-ping', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, enabled: newEnabled }),
      })
      if (!res.ok) throw new Error(await res.text())
      setEnabled(newEnabled)
    } catch (err: any) {
      setError('Failed to save setting. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-start gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
      <div className="w-9 h-9 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center shrink-0">
        <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              Send satisfaction check-in after AI conversations
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Leads receive a brief &ldquo;Was this helpful?&rdquo; message after an AI exchange. Helps improve AI quality.
            </p>
          </div>
          <button
            onClick={handleToggle}
            disabled={loading || saving}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
            }`}
            aria-label="Toggle satisfaction ping"
            role="switch"
            aria-checked={enabled}
          >
            {saving ? (
              <Loader2 className="absolute inset-0 m-auto w-3 h-3 text-white animate-spin" />
            ) : (
              <span
                className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
                  enabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            )}
          </button>
        </div>
        {error && (
          <p className="text-xs text-red-600 mt-1">{error}</p>
        )}
      </div>
    </div>
  )
}
