'use client'

import { useEffect, useState } from 'react'

interface PilotSignup {
  id: string
  name: string
  email: string
  phone: string | null
  brokerage_name: string | null
  team_name: string | null
  monthly_leads: string | null
  current_crm: string | null
  status: 'new' | 'contacted' | 'approved' | 'declined'
  source: string
  utm_campaign: string | null
  created_at: string
  contacted_at: string | null
  invited: boolean
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
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

const LEADS_LABELS: Record<string, string> = {
  '1-10': '1–10/mo',
  '11-50': '11–50/mo',
  '51-100': '51–100/mo',
  '100+': '100+/mo',
}

export default function PilotSignupsAdminPage() {
  const [signups, setSignups] = useState<PilotSignup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [inviting, setInviting] = useState<string | null>(null)

  useEffect(() => {
    fetchSignups()
  }, [statusFilter])

  async function fetchSignups() {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/admin/pilot-signups/list?${params}`)
      if (!res.ok) throw new Error(`API error: ${res.statusText}`)
      const result = await res.json()
      setSignups(result.signups || [])
    } catch (err: any) {
      setError(err.message || 'Failed to fetch signups')
    } finally {
      setLoading(false)
    }
  }

  async function sendInvite(signup: PilotSignup) {
    setInviting(signup.id)
    try {
      const res = await fetch('/api/admin/pilot-signups/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signup.email, name: signup.name }),
      })
      const result = await res.json()
      if (!res.ok) {
        alert(`Failed to send invite: ${result.error || res.statusText}`)
        return
      }
      alert(`Invite sent to ${signup.email}${result.emailSent ? '' : ' (email delivery skipped — RESEND_API_KEY not set)'}`)
      setSignups(prev => prev.map(s => s.id === signup.id ? { ...s, invited: true } : s))
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setInviting(null)
    }
  }

  const formatDate = (d: string | null) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  }

  const filtered = signups.filter(s => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      s.name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.brokerage_name?.toLowerCase().includes(q)
    )
  })

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
        <button onClick={fetchSignups} className="mt-3 px-4 py-2 bg-blue-600 text-white rounded text-sm">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="p-8 bg-white min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Pilot Signups</h1>
        <p className="text-gray-500 mt-1">{filtered.length} of {signups.length} signups</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search name, email, brokerage..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded text-sm w-72"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded text-sm"
        >
          <option value="">All statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="approved">Approved</option>
          <option value="declined">Declined</option>
        </select>
        <button
          onClick={fetchSignups}
          className="px-3 py-2 bg-gray-100 border border-gray-300 rounded text-sm hover:bg-gray-200"
        >
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="text-left p-4 font-semibold">Name</th>
              <th className="text-left p-4 font-semibold">Brokerage</th>
              <th className="text-left p-4 font-semibold">Leads/mo</th>
              <th className="text-left p-4 font-semibold">CRM</th>
              <th className="text-left p-4 font-semibold">Status</th>
              <th className="text-left p-4 font-semibold">Source</th>
              <th className="text-left p-4 font-semibold">Signed Up</th>
              <th className="text-left p-4 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-400">
                  No signups found.
                </td>
              </tr>
            )}
            {filtered.map(signup => (
              <tr key={signup.id} className="border-b border-gray-200 hover:bg-gray-100">
                <td className="p-4">
                  <p className="font-medium">{signup.name}</p>
                  <p className="text-gray-500 text-xs">{signup.email}</p>
                  {signup.phone && <p className="text-gray-400 text-xs">{signup.phone}</p>}
                </td>
                <td className="p-4 text-gray-700">
                  {signup.brokerage_name || '—'}
                  {signup.team_name && (
                    <p className="text-gray-400 text-xs">{signup.team_name}</p>
                  )}
                </td>
                <td className="p-4 text-gray-700">
                  {signup.monthly_leads ? (LEADS_LABELS[signup.monthly_leads] || signup.monthly_leads) : '—'}
                </td>
                <td className="p-4 text-gray-700">
                  {signup.current_crm ? (CRM_LABELS[signup.current_crm] || signup.current_crm) : '—'}
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${STATUS_COLORS[signup.status] || 'bg-gray-100'}`}>
                    {STATUS_LABELS[signup.status] || signup.status}
                  </span>
                </td>
                <td className="p-4 text-gray-500 text-xs">
                  {signup.source}
                  {signup.utm_campaign && (
                    <p className="text-gray-400">{signup.utm_campaign}</p>
                  )}
                </td>
                <td className="p-4 text-gray-500 text-xs">
                  {formatDate(signup.created_at)}
                </td>
                <td className="p-4">
                  {signup.invited ? (
                    <span className="text-green-600 text-xs font-medium">Invited</span>
                  ) : (
                    <button
                      onClick={() => sendInvite(signup)}
                      disabled={inviting === signup.id}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {inviting === signup.id ? 'Sending...' : 'Send Invite'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
