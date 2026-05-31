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
  status: string
  source: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  follow_up_sent: boolean | null
  created_at: string
  contacted_at: string | null
  invited: boolean
  invited_at: string | null
}

interface Stats {
  total: number
  new: number
  follow_up_sent: number
  invited: number
}

interface ApiResponse {
  signups: PilotSignup[]
  total: number
  stats: Stats
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-800',
}

const CRM_LABELS: Record<string, string> = {
  follow_up_boss: 'Follow Up Boss',
  liondesk: 'LionDesk',
  kvcore: 'kvCORE',
  other: 'Other',
  none: 'None',
}

export default function PilotSignupsAdminPage() {
  const [signups, setSignups] = useState<PilotSignup[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSignup, setSelectedSignup] = useState<PilotSignup | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterSearch, setFilterSearch] = useState<string>('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteMessage, setInviteMessage] = useState<string | null>(null)

  async function fetchSignups(status: string) {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (status && status !== 'all') params.set('status', status)
      const res = await fetch(`/api/admin/pilot-signups/list?${params}`)
      if (!res.ok) throw new Error(`API error: ${res.status}`)
      const data: ApiResponse = await res.json()
      setSignups(data.signups || [])
      setStats(data.stats || null)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch signups')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSignups(filterStatus)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const handleInvite = async () => {
    if (!selectedSignup) return
    if (!confirm(`Send invite to ${selectedSignup.name} (${selectedSignup.email})?`)) return

    setInviteLoading(true)
    setInviteMessage(null)
    try {
      const res = await fetch('/api/admin/pilot-signups/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: selectedSignup.email, name: selectedSignup.name }),
      })
      const data = await res.json()
      if (!res.ok) {
        setInviteMessage(`Error: ${data.error || 'Failed to send invite'}`)
      } else {
        setInviteMessage(
          data.emailSent ? 'Invite sent successfully.' : 'Invite created (email not sent — no RESEND_API_KEY).'
        )
        // Refresh list to show updated invited status
        await fetchSignups(filterStatus)
        // Re-select the updated row
        setSelectedSignup(prev =>
          prev ? { ...prev, invited: true, invited_at: new Date().toISOString() } : prev
        )
      }
    } catch (err: any) {
      setInviteMessage(`Error: ${err.message}`)
    } finally {
      setInviteLoading(false)
    }
  }

  const visibleSignups = signups.filter(s => {
    if (!filterSearch) return true
    const q = filterSearch.toLowerCase()
    return (
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.brokerage_name || '').toLowerCase().includes(q)
    )
  })

  if (loading && signups.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold">Pilot Signups</h1>
        <p className="mt-4 text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="p-8 bg-white min-h-screen">
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Pilot Signups</h1>
            <p className="mt-1 text-gray-500 text-sm">
              Landing page signups waiting for invite or outreach.
            </p>
          </div>
          <a
            href="/admin"
            className="text-sm text-blue-600 hover:underline"
          >
            ← Back to Admin
          </a>
        </div>

        {stats && (
          <div className="mt-4 flex gap-4 flex-wrap">
            <div className="px-4 py-2 rounded-lg bg-blue-50 border border-blue-200 text-sm">
              <span className="font-semibold text-blue-800">{stats.total}</span>
              <span className="text-blue-600 ml-1">total</span>
            </div>
            <div className="px-4 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm">
              <span className="font-semibold text-gray-800">{stats.new}</span>
              <span className="text-gray-600 ml-1">new</span>
            </div>
            <div className="px-4 py-2 rounded-lg bg-yellow-50 border border-yellow-200 text-sm">
              <span className="font-semibold text-yellow-800">{stats.follow_up_sent}</span>
              <span className="text-yellow-600 ml-1">follow-up sent</span>
            </div>
            <div className="px-4 py-2 rounded-lg bg-green-50 border border-green-200 text-sm">
              <span className="font-semibold text-green-800">{stats.invited}</span>
              <span className="text-green-600 ml-1">invited</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex gap-3 flex-wrap items-center">
        <input
          type="text"
          placeholder="Search name, email, brokerage..."
          value={filterSearch}
          onChange={e => setFilterSearch(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 text-sm w-72"
        />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="approved">Approved</option>
          <option value="declined">Declined</option>
        </select>
        {loading && (
          <span className="text-sm text-gray-400">Refreshing...</span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* List */}
        <div className="lg:col-span-2">
          <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="text-left p-4 font-semibold">Name / Email</th>
                  <th className="text-left p-4 font-semibold">CRM</th>
                  <th className="text-left p-4 font-semibold">Status</th>
                  <th className="text-left p-4 font-semibold">Invited</th>
                  <th className="text-left p-4 font-semibold">Signed Up</th>
                </tr>
              </thead>
              <tbody>
                {visibleSignups.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400">
                      No signups found.
                    </td>
                  </tr>
                )}
                {visibleSignups.map(signup => (
                  <tr
                    key={signup.id}
                    className={`border-b border-gray-200 hover:bg-gray-100 cursor-pointer ${
                      selectedSignup?.id === signup.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => {
                      setSelectedSignup(signup)
                      setInviteMessage(null)
                    }}
                  >
                    <td className="p-4">
                      <p className="font-medium">{signup.name}</p>
                      <p className="text-xs text-gray-500">{signup.email}</p>
                      {signup.brokerage_name && (
                        <p className="text-xs text-gray-400">{signup.brokerage_name}</p>
                      )}
                    </td>
                    <td className="p-4 text-gray-600">
                      {signup.current_crm ? (CRM_LABELS[signup.current_crm] || signup.current_crm) : '—'}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${STATUS_COLORS[signup.status] || 'bg-gray-100 text-gray-700'}`}>
                        {signup.status}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-gray-500">
                      {signup.invited ? (
                        <span className="text-green-700 font-medium">Yes {signup.invited_at ? formatDate(signup.invited_at) : ''}</span>
                      ) : '—'}
                    </td>
                    <td className="p-4 text-xs text-gray-500">
                      {formatDate(signup.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {visibleSignups.length > 0 && (
            <p className="mt-2 text-xs text-gray-400">
              Showing {visibleSignups.length} of {signups.length} signups
            </p>
          )}
        </div>

        {/* Detail Panel */}
        {selectedSignup && (
          <div className="lg:col-span-1 bg-gray-50 rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-bold mb-1">{selectedSignup.name}</h2>
            <p className="text-sm text-gray-500 mb-4">{selectedSignup.email}</p>

            <div className="space-y-3 text-sm mb-6">
              {selectedSignup.phone && (
                <div>
                  <span className="font-semibold text-gray-600">Phone: </span>
                  <span>{selectedSignup.phone}</span>
                </div>
              )}
              {selectedSignup.brokerage_name && (
                <div>
                  <span className="font-semibold text-gray-600">Brokerage: </span>
                  <span>{selectedSignup.brokerage_name}</span>
                </div>
              )}
              {selectedSignup.team_name && (
                <div>
                  <span className="font-semibold text-gray-600">Team: </span>
                  <span>{selectedSignup.team_name}</span>
                </div>
              )}
              {selectedSignup.monthly_leads && (
                <div>
                  <span className="font-semibold text-gray-600">Monthly Leads: </span>
                  <span>{selectedSignup.monthly_leads}</span>
                </div>
              )}
              {selectedSignup.current_crm && (
                <div>
                  <span className="font-semibold text-gray-600">CRM: </span>
                  <span>{CRM_LABELS[selectedSignup.current_crm] || selectedSignup.current_crm}</span>
                </div>
              )}
              <div>
                <span className="font-semibold text-gray-600">Source: </span>
                <span>{selectedSignup.source || '—'}</span>
              </div>
              {selectedSignup.utm_campaign && (
                <div>
                  <span className="font-semibold text-gray-600">Campaign: </span>
                  <span>{selectedSignup.utm_campaign}</span>
                </div>
              )}
              {selectedSignup.utm_source && (
                <div>
                  <span className="font-semibold text-gray-600">UTM Source: </span>
                  <span>{selectedSignup.utm_source}</span>
                </div>
              )}
              <div>
                <span className="font-semibold text-gray-600">Status: </span>
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATUS_COLORS[selectedSignup.status] || 'bg-gray-100'}`}>
                  {selectedSignup.status}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Signed Up: </span>
                <span>{formatDate(selectedSignup.created_at)}</span>
              </div>
              {selectedSignup.contacted_at && (
                <div>
                  <span className="font-semibold text-gray-600">Contacted: </span>
                  <span>{formatDate(selectedSignup.contacted_at)}</span>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              {selectedSignup.invited ? (
                <div className="p-3 rounded bg-green-50 border border-green-200 text-green-700 text-sm">
                  Invited on {selectedSignup.invited_at ? formatDate(selectedSignup.invited_at) : 'unknown date'}
                </div>
              ) : (
                <>
                  <button
                    onClick={handleInvite}
                    disabled={inviteLoading}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded font-semibold text-sm hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {inviteLoading ? 'Sending...' : 'Send Pilot Invite'}
                  </button>
                  {inviteMessage && (
                    <p className={`mt-2 text-xs ${inviteMessage.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
                      {inviteMessage}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
