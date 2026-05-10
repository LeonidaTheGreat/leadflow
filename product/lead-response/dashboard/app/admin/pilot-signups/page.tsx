'use client'

import { useEffect, useState } from 'react'

const TEST_EMAIL_PATTERNS = [/@test\.local$/i, /@test\.com$/i, /@example\.com$/i, /@qc\.local$/i]

function isTestAccount(email: string): boolean {
  return TEST_EMAIL_PATTERNS.some(p => p.test(email))
}

interface PilotSignup {
  id: string
  name: string
  email: string
  phone: string | null
  brokerage_name: string | null
  team_name: string | null
  monthly_leads: string | null
  current_crm: string | null
  status: string
  source: string | null
  utm_campaign: string | null
  created_at: string
  updated_at: string
  contacted_at: string | null
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-800',
}

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  approved: 'Approved',
  declined: 'Declined',
}

const CRM_LABELS: Record<string, string> = {
  follow_up_boss: 'Follow Up Boss',
  liondesk: 'LionDesk',
  kvcore: 'kvCORE',
  other: 'Other',
  none: 'None',
}

const LEAD_LABELS: Record<string, string> = {
  '1-10': '1–10/mo',
  '11-50': '11–50/mo',
  '51-100': '51–100/mo',
  '100+': '100+/mo',
}

export default function PilotSignupsAdminPage() {
  const [signups, setSignups] = useState<PilotSignup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<PilotSignup | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showTestAccounts, setShowTestAccounts] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    async function fetchSignups() {
      try {
        const res = await fetch('/api/admin/pilot-signups/list')
        if (!res.ok) throw new Error(`API error: ${res.statusText}`)
        const result = await res.json()
        setSignups(result.signups || [])
      } catch (err: any) {
        setError(err.message || 'Failed to fetch signups')
      } finally {
        setLoading(false)
      }
    }
    fetchSignups()
  }, [])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const handleSendInvite = async () => {
    if (!selected) return
    setActionLoading(true)
    try {
      const res = await fetch('/api/admin/pilot-signups/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: selected.email, name: selected.name }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || res.statusText)
      const updated = signups.map(s =>
        s.id === selected.id ? { ...s, status: 'contacted', contacted_at: new Date().toISOString() } : s
      )
      setSignups(updated)
      setSelected({ ...selected, status: 'contacted', contacted_at: new Date().toISOString() })
      alert(`Invite sent to ${selected.email}${result.emailSent ? '' : ' (email delivery failed — invite record created)'}`)
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold">Pilot Signups</h1>
        <p className="mt-4 text-gray-500">Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold">Pilot Signups</h1>
        <p className="mt-4 text-red-600">Error: {error}</p>
      </div>
    )
  }

  const realSignups = signups.filter(s => !isTestAccount(s.email))
  const testSignups = signups.filter(s => isTestAccount(s.email))
  const visibleSignups = (showTestAccounts ? signups : realSignups).filter(
    s => filterStatus === 'all' || s.status === filterStatus
  )

  const countByStatus = (status: string) =>
    realSignups.filter(s => s.status === status).length

  return (
    <div className="p-8 bg-white min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Pilot Signups</h1>
        <p className="mt-1 text-gray-500 text-sm">
          Research leads who signed up on the landing page. Send invites to move them into the pilot pipeline.
        </p>
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          {(['new', 'contacted', 'approved', 'declined'] as const).map(s => (
            <div key={s} className={`px-3 py-1 rounded-full text-sm font-semibold ${STATUS_COLORS[s]}`}>
              {countByStatus(s)} {STATUS_LABELS[s].toLowerCase()}
            </div>
          ))}
          {testSignups.length > 0 && (
            <div className="px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-500">
              {testSignups.length} test
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">Status:</label>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="all">All</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="approved">Approved</option>
            <option value="declined">Declined</option>
          </select>
        </div>
        {testSignups.length > 0 && (
          <button
            onClick={() => setShowTestAccounts(v => !v)}
            className="text-xs text-gray-400 underline"
          >
            {showTestAccounts ? 'Hide test accounts' : `Show ${testSignups.length} test account${testSignups.length !== 1 ? 's' : ''}`}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Signups List */}
        <div className="lg:col-span-2">
          <div className="bg-gray-50 rounded-lg border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="text-left p-4 font-semibold">Name</th>
                    <th className="text-left p-4 font-semibold">Brokerage</th>
                    <th className="text-left p-4 font-semibold">Leads/mo</th>
                    <th className="text-left p-4 font-semibold">Status</th>
                    <th className="text-left p-4 font-semibold">Signed Up</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleSignups.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-400">
                        No signups match the current filter.
                      </td>
                    </tr>
                  )}
                  {visibleSignups.map(signup => (
                    <tr
                      key={signup.id}
                      className={`border-b border-gray-200 hover:bg-gray-100 cursor-pointer ${
                        selected?.id === signup.id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => setSelected(signup)}
                    >
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{signup.name}</p>
                          <p className="text-gray-500 text-xs">{signup.email}</p>
                          {isTestAccount(signup.email) && (
                            <span className="text-xs bg-gray-200 text-gray-500 px-1 rounded">test</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-gray-600">
                        {signup.brokerage_name || '—'}
                      </td>
                      <td className="p-4 text-gray-600">
                        {signup.monthly_leads ? (LEAD_LABELS[signup.monthly_leads] || signup.monthly_leads) : '—'}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${STATUS_COLORS[signup.status] || 'bg-gray-100 text-gray-700'}`}>
                          {STATUS_LABELS[signup.status] || signup.status}
                        </span>
                      </td>
                      <td className="p-4 text-gray-500 text-xs">
                        {formatDate(signup.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Detail Panel */}
        {selected ? (
          <div className="lg:col-span-1 bg-gray-50 rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-bold mb-1">{selected.name}</h2>
            <p className="text-gray-500 text-sm mb-4">{selected.email}</p>

            <div className="space-y-3 mb-6 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className={`px-2 py-0.5 rounded font-semibold text-xs ${STATUS_COLORS[selected.status] || 'bg-gray-100'}`}>
                  {STATUS_LABELS[selected.status] || selected.status}
                </span>
              </div>
              {selected.phone && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Phone</span>
                  <span>{selected.phone}</span>
                </div>
              )}
              {selected.brokerage_name && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Brokerage</span>
                  <span className="text-right max-w-[160px]">{selected.brokerage_name}</span>
                </div>
              )}
              {selected.team_name && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Team</span>
                  <span>{selected.team_name}</span>
                </div>
              )}
              {selected.monthly_leads && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Monthly leads</span>
                  <span>{LEAD_LABELS[selected.monthly_leads] || selected.monthly_leads}</span>
                </div>
              )}
              {selected.current_crm && (
                <div className="flex justify-between">
                  <span className="text-gray-500">CRM</span>
                  <span>{CRM_LABELS[selected.current_crm] || selected.current_crm}</span>
                </div>
              )}
              {selected.source && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Source</span>
                  <span>{selected.source}</span>
                </div>
              )}
              {selected.utm_campaign && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Campaign</span>
                  <span className="text-right max-w-[160px] truncate">{selected.utm_campaign}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Signed up</span>
                <span>{formatDate(selected.created_at)}</span>
              </div>
              {selected.contacted_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Contacted</span>
                  <span>{formatDate(selected.contacted_at)}</span>
                </div>
              )}
            </div>

            <div className="border-t pt-5">
              <button
                onClick={handleSendInvite}
                disabled={actionLoading || selected.status === 'approved' || selected.status === 'declined'}
                className="w-full px-3 py-2 bg-emerald-600 text-white rounded text-sm font-semibold hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {actionLoading
                  ? 'Sending...'
                  : selected.status === 'contacted'
                  ? 'Resend Invite'
                  : selected.status === 'approved'
                  ? 'Already approved'
                  : selected.status === 'declined'
                  ? 'Declined'
                  : 'Send Invite'}
              </button>
              {selected.status === 'contacted' && (
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Invite already sent — will send again
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="lg:col-span-1 bg-gray-50 rounded-lg border border-gray-200 p-6 flex items-center justify-center">
            <p className="text-gray-400 text-sm">Select a row to view details</p>
          </div>
        )}
      </div>
    </div>
  )
}
