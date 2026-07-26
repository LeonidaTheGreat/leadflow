'use client'

/**
 * /admin/payments — Stripe Checkout Failure Diagnostics
 *
 * Gives Stojan real-time visibility into every Stripe checkout event:
 * - Last 30 events with type and status
 * - checkout.session.created vs completed ratio
 * - Price ID config validity (flags invalid/placeholder IDs with the rejected value)
 * - Last payment attempt timestamp
 *
 * UC: uc-leadflow-checkout-failure-diagnostics
 */

import { useEffect, useState, useCallback } from 'react'

interface StripeEvent {
  id: string
  type: string
  received_at: string
  status: string | null
  amount_total: number | null
  currency: string | null
}

interface InvalidPrice {
  envVar: string
  value: string
}

interface PriceIdHealth {
  valid: string[]
  invalid: InvalidPrice[]
  missing: string[]
}

interface PaymentsDiagnostics {
  events: StripeEvent[]
  ratio: {
    created: number
    completed: number
    expired: number
    conversion_rate: number | null
  }
  lastPaymentAttempt: string | null
  priceIdHealth: PriceIdHealth
  as_of: string
}

function fmtDate(iso: string): string {
  const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z')
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function fmtAmount(cents: number | null, currency: string | null): string {
  if (cents == null) return '—'
  const dollars = cents / 100
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency?.toUpperCase() ?? 'USD',
  }).format(dollars)
}

function eventBadgeClass(type: string): string {
  if (type.includes('completed')) return 'bg-green-100 text-green-800'
  if (type.includes('expired') || type.includes('failed') || type.includes('failed')) return 'bg-red-100 text-red-800'
  if (type.includes('created')) return 'bg-blue-100 text-blue-800'
  if (type.includes('payment_failed') || type.includes('payment_action_required')) return 'bg-orange-100 text-orange-800'
  return 'bg-gray-100 text-gray-700'
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

export default function PaymentsDiagnosticsPage() {
  const [data, setData] = useState<PaymentsDiagnostics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/payments', { credentials: 'include' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      setData(await res.json())
    } catch (err: any) {
      setError(err.message ?? 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const priceOk = data && data.priceIdHealth.invalid.length === 0 && data.priceIdHealth.missing.length === 0
  const conversionRate = data?.ratio.conversion_rate
  const conversionDisplay = conversionRate != null ? `${conversionRate}%` : 'N/A'

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stripe Checkout Diagnostics</h1>
          <p className="text-gray-500 text-sm mt-1">
            Real-time visibility into every payment attempt and failure.
            {data?.as_of && (
              <span className="ml-2 text-gray-400">Updated {fmtDate(data.as_of)}</span>
            )}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 font-medium disabled:opacity-50 transition-colors"
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          Error: {error}
        </div>
      )}

      {/* Summary cards */}
      {data && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
          <StatCard
            label="Last Payment Attempt"
            value={data.lastPaymentAttempt ? fmtDate(data.lastPaymentAttempt) : 'None'}
            sub="checkout.session.created"
          />
          <StatCard
            label="Conversion Rate"
            value={conversionDisplay}
            sub={`${data.ratio.completed} completed / ${data.ratio.created} initiated`}
          />
          <StatCard
            label="Expired Sessions"
            value={String(data.ratio.expired)}
            sub="checkout.session.expired"
          />
          <StatCard
            label="Price ID Config"
            value={priceOk ? 'OK' : `${data.priceIdHealth.invalid.length + data.priceIdHealth.missing.length} issue(s)`}
            sub={priceOk ? `${data.priceIdHealth.valid.length} valid` : 'See below'}
          />
        </div>
      )}

      {/* Price ID Health */}
      {data && (!priceOk) && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4" data-testid="price-id-health-alert">
          <h2 className="text-sm font-semibold text-red-800 mb-2">Price ID Configuration Issues</h2>
          {data.priceIdHealth.invalid.length > 0 && (
            <div className="mb-2">
              <p className="text-xs font-medium text-red-700 mb-1">Invalid / Placeholder IDs (isValidPriceId rejected):</p>
              <ul className="space-y-1">
                {data.priceIdHealth.invalid.map(({ envVar, value }) => (
                  <li key={envVar} className="text-xs font-mono text-red-800 bg-red-100 rounded px-2 py-1">
                    <span className="font-semibold">{envVar}</span>
                    {' = '}
                    <span className="text-red-600">{value}</span>
                    <span className="ml-2 text-red-500">(rejected — not a real Stripe price ID)</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data.priceIdHealth.missing.length > 0 && (
            <div>
              <p className="text-xs font-medium text-red-700 mb-1">Missing env vars:</p>
              <ul className="space-y-0.5">
                {data.priceIdHealth.missing.map(envVar => (
                  <li key={envVar} className="text-xs font-mono text-red-800">{envVar}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {data && priceOk && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-center gap-2" data-testid="price-id-health-ok">
          <span>✓</span>
          <span>All {data.priceIdHealth.valid.length} Stripe price IDs are valid.</span>
        </div>
      )}

      {/* Event log */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Last 30 Stripe Events</h2>
          {data && <span className="text-xs text-gray-400">{data.events.length} event{data.events.length !== 1 ? 's' : ''}</span>}
        </div>

        {loading && !data && (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        )}

        {!loading && data && data.events.length === 0 && (
          <div className="p-8 text-center text-gray-400 text-sm">
            No events yet. Events appear here when Stripe webhooks are received.
          </div>
        )}

        {data && data.events.length > 0 && (
          <table className="w-full text-sm" data-testid="events-table">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Event Type</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.events.map(event => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${eventBadgeClass(event.type)}`}>
                      {event.type}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-500 text-xs">{event.status ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-500 text-xs">{fmtAmount(event.amount_total, event.currency)}</td>
                  <td className="px-4 py-2 text-gray-400 text-xs">{fmtDate(event.received_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
