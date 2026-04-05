'use client'

import { useEffect, useState } from 'react'

interface AgentCard {
  agent_id: string
  email: string
  first_name: string
  last_name: string
  trial_ends_at: string
  days_remaining: number
  fub_connected_at: string | null
  leads_last_7d: number
  sms_sent_last_7d: number
  last_activity_at: string | null
}

interface ActivationData {
  summary: {
    total_trial_agents: number
    active: number
    onboarded: number
    never_activated: number
    as_of: string
    window_days: number
  }
  segments: {
    active: AgentCard[]
    onboarded: AgentCard[]
    never_activated: AgentCard[]
  }
}

function relativeTime(isoDate: string | null): string {
  if (!isoDate) return 'never'
  const diffMs = Date.now() - new Date(isoDate).getTime()
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  return 'just now'
}

function trialCountdownColor(days: number): string {
  if (days < 3) return '#ef4444'   // red
  if (days <= 7) return '#f59e0b'  // yellow
  return '#22c55e'                 // green
}

function AgentCardItem({
  agent,
  segment,
}: {
  agent: AgentCard
  segment: 'active' | 'onboarded' | 'never_activated'
}) {
  const countdownColor = trialCountdownColor(agent.days_remaining)

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: '14px 16px',
        marginBottom: 12,
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>
        {agent.first_name} {agent.last_name}
      </div>
      <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 8 }}>{agent.email}</div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, marginBottom: 8 }}>
        <span>
          Trial ends:{' '}
          <strong style={{ color: countdownColor }}>
            {agent.days_remaining >= 0 ? `${agent.days_remaining}d` : 'expired'}
          </strong>
        </span>
        <span>
          Last active: <strong>{relativeTime(agent.last_activity_at)}</strong>
        </span>
      </div>

      {segment === 'active' && (
        <div style={{ fontSize: 13, color: '#374151', marginBottom: 8 }}>
          Leads (7d): <strong>{agent.leads_last_7d}</strong> &nbsp;|&nbsp; SMS sent (7d):{' '}
          <strong>{agent.sms_sent_last_7d}</strong>
        </div>
      )}

      {segment === 'onboarded' && (
        <div style={{ fontSize: 13, color: '#374151', marginBottom: 8 }}>
          FUB connected:{' '}
          <strong>{agent.fub_connected_at ? relativeTime(agent.fub_connected_at) : 'unknown'}</strong>
        </div>
      )}

      {segment === 'never_activated' && (
        <div style={{ fontSize: 13, color: '#374151', marginBottom: 8 }}>
          Trial started:{' '}
          <strong>{relativeTime(agent.trial_ends_at)}</strong> to go — has not connected FUB
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          disabled
          title="Send Activation Email (coming soon)"
          style={{
            padding: '5px 12px',
            borderRadius: 6,
            border: '1px solid #d1d5db',
            background: '#f9fafb',
            color: '#374151',
            fontSize: 12,
            cursor: 'not-allowed',
            opacity: 0.7,
          }}
        >
          Send Email
        </button>
        <button
          disabled
          title="Flag for Manual Outreach (coming soon)"
          style={{
            padding: '5px 12px',
            borderRadius: 6,
            border: '1px solid #d1d5db',
            background: '#f9fafb',
            color: '#374151',
            fontSize: 12,
            cursor: 'not-allowed',
            opacity: 0.7,
          }}
        >
          Flag
        </button>
      </div>
    </div>
  )
}

function SegmentColumn({
  title,
  count,
  agents,
  segment,
  accent,
}: {
  title: string
  count: number
  agents: AgentCard[]
  segment: 'active' | 'onboarded' | 'never_activated'
  accent: string
}) {
  return (
    <div style={{ flex: 1, minWidth: 260 }}>
      <div
        style={{
          background: accent,
          color: '#fff',
          padding: '10px 16px',
          borderRadius: '8px 8px 0 0',
          fontWeight: 700,
          fontSize: 15,
          marginBottom: 0,
        }}
      >
        {title} ({count})
      </div>
      <div
        style={{
          border: '1px solid #e5e7eb',
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
          padding: 12,
          background: '#f9fafb',
          minHeight: 100,
        }}
      >
        {agents.length === 0 ? (
          <div style={{ color: '#9ca3af', textAlign: 'center', paddingTop: 24, fontSize: 14 }}>
            No agents in this segment
          </div>
        ) : (
          agents.map((a) => (
            <AgentCardItem key={a.agent_id} agent={a} segment={segment} />
          ))
        )}
      </div>
    </div>
  )
}

export default function TrialActivationPage() {
  const [data, setData] = useState<ActivationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [windowDays, setWindowDays] = useState(7)

  async function fetchData(days: number) {
    setLoading(true)
    setError(null)
    try {
      const apiKey = process.env.NEXT_PUBLIC_LEADFLOW_API_KEY ?? ''
      const res = await fetch(`/api/admin/funnel/trial-activation?window_days=${days}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      if (res.status === 401) {
        setError('Unauthorized — API key required to view this page.')
        return
      }
      if (!res.ok) {
        setError(`API error: ${res.status} ${res.statusText}`)
        return
      }
      const json = await res.json()
      setData(json)
    } catch (err: any) {
      setError(err.message ?? 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(windowDays)
  }, [windowDays])

  return (
    <div style={{ padding: '24px', fontFamily: 'system-ui, sans-serif', maxWidth: 1200 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
          Trial Activation Diagnostics
        </h1>
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 12 }}>
          Segments trial agents by activation state to identify who to contact and when.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ fontSize: 14, color: '#374151' }}>
            Activity window:
            <select
              value={windowDays}
              onChange={(e) => setWindowDays(Number(e.target.value))}
              style={{
                marginLeft: 8,
                padding: '4px 8px',
                borderRadius: 6,
                border: '1px solid #d1d5db',
                fontSize: 14,
              }}
            >
              <option value={3}>3 days</option>
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
          </label>
          <button
            onClick={() => fetchData(windowDays)}
            style={{
              padding: '5px 14px',
              borderRadius: 6,
              border: '1px solid #3b82f6',
              background: '#3b82f6',
              color: '#fff',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ color: '#6b7280', textAlign: 'center', paddingTop: 48 }}>Loading...</div>
      )}

      {error && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: 8,
            padding: '12px 16px',
            color: '#b91c1c',
            marginBottom: 24,
          }}
        >
          {error}
        </div>
      )}

      {!loading && data && (
        <>
          {/* Summary bar */}
          <div
            style={{
              display: 'flex',
              gap: 16,
              marginBottom: 24,
              flexWrap: 'wrap',
            }}
          >
            {[
              { label: 'Total Trial Agents', value: data.summary.total_trial_agents, color: '#6b7280' },
              { label: 'Active', value: data.summary.active, color: '#16a34a' },
              { label: 'Onboarded', value: data.summary.onboarded, color: '#2563eb' },
              { label: 'Never Activated', value: data.summary.never_activated, color: '#dc2626' },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  flex: '0 0 auto',
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: '12px 20px',
                  textAlign: 'center',
                  minWidth: 130,
                }}
              >
                <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Segment columns */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <SegmentColumn
              title="Active"
              count={data.summary.active}
              agents={data.segments.active}
              segment="active"
              accent="#16a34a"
            />
            <SegmentColumn
              title="Onboarded"
              count={data.summary.onboarded}
              agents={data.segments.onboarded}
              segment="onboarded"
              accent="#2563eb"
            />
            <SegmentColumn
              title="Never Activated"
              count={data.summary.never_activated}
              agents={data.segments.never_activated}
              segment="never_activated"
              accent="#dc2626"
            />
          </div>

          <div style={{ marginTop: 16, fontSize: 12, color: '#9ca3af' }}>
            Last updated: {new Date(data.summary.as_of).toLocaleString()} &nbsp;|&nbsp;
            Window: {data.summary.window_days} days
          </div>
        </>
      )}
    </div>
  )
}
