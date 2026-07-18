'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Prospect {
  id: string
  name: string
  email: string
  phone: string | null
  status: string
  follow_up_stage: number | string | null
  last_follow_up_at: string | null
  created_at: string
  brokerage_name: string | null
  source: string | null
}

type FilterTab = 'all' | 'not_contacted' | 'magic_link_sent' | 'trial_started'

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-gray-100 text-gray-600',
  contacted: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-600',
}

function daysSince(iso: string | null): string {
  if (!iso) return '-'
  const ms = Date.now() - new Date(iso.endsWith('Z') ? iso : iso + 'Z').getTime()
  const days = Math.floor(ms / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return '1d'
  return `${days}d`
}

function matchesFilter(prospect: Prospect, tab: FilterTab): boolean {
  if (tab === 'all') return true
  const stage = String(prospect.follow_up_stage ?? '0')
  if (tab === 'not_contacted') return prospect.status === 'new' && stage === '0'
  if (tab === 'magic_link_sent') return stage === 'magic-link-sent'
  if (tab === 'trial_started') return prospect.status === 'approved'
  return true
}

export default function ProspectsPage() {
  const router = useRouter()
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterTab, setFilterTab] = useState<FilterTab>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', email: '', phone: '' })
  const [addSubmitting, setAddSubmitting] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [linkDialog, setLinkDialog] = useState<{ url: string; email: string } | null>(null)
  const [generatingLink, setGeneratingLink] = useState<string | null>(null)
  const [markingContacted, setMarkingContacted] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadProspects()
  }, [])

  async function loadProspects() {
    try {
      const res = await fetch('/api/admin/prospects')
      if (res.status === 401) {
        router.replace('/admin/login?redirect=/admin/prospects')
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setProspects(data.prospects ?? [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function addProspect() {
    setAddSubmitting(true)
    setAddError(null)
    try {
      const res = await fetch('/api/admin/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      })
      if (res.status === 401) {
        router.replace('/admin/login?redirect=/admin/prospects')
        return
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setProspects(prev => [data.prospect, ...prev])
      setShowAddModal(false)
      setAddForm({ name: '', email: '', phone: '' })
    } catch (e: any) {
      setAddError(e.message)
    } finally {
      setAddSubmitting(false)
    }
  }

  async function generateTrialLink(prospect: Prospect) {
    setGeneratingLink(prospect.id)
    try {
      const nameParts = prospect.name.trim().split(/\s+/)
      const firstName = nameParts[0] || prospect.name
      const lastName = nameParts.slice(1).join(' ') || '-'

      const res = await fetch('/api/admin/prospects/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: prospect.email,
          firstName,
          lastName,
          prospectId: prospect.id,
        }),
      })
      if (res.status === 401) {
        router.replace('/admin/login?redirect=/admin/prospects')
        return
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')

      setLinkDialog({ url: data.loginUrl, email: prospect.email })
      setProspects(prev =>
        prev.map(p =>
          p.id === prospect.id
            ? { ...p, status: 'contacted', follow_up_stage: 'magic-link-sent', last_follow_up_at: new Date().toISOString() }
            : p
        )
      )
    } catch (e: any) {
      alert(`Error: ${e.message}`)
    } finally {
      setGeneratingLink(null)
    }
  }

  async function markContacted(prospect: Prospect) {
    setMarkingContacted(prospect.id)
    try {
      const res = await fetch(`/api/admin/prospects/${prospect.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'contacted',
          last_follow_up_at: new Date().toISOString(),
        }),
      })
      if (res.status === 401) {
        router.replace('/admin/login?redirect=/admin/prospects')
        return
      }
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed')
      }
      setProspects(prev =>
        prev.map(p =>
          p.id === prospect.id ? { ...p, status: 'contacted' } : p
        )
      )
    } catch (e: any) {
      alert(`Error: ${e.message}`)
    } finally {
      setMarkingContacted(null)
    }
  }

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const filtered = prospects.filter(p => matchesFilter(p, filterTab))

  const tabCounts = {
    all: prospects.length,
    not_contacted: prospects.filter(p => matchesFilter(p, 'not_contacted')).length,
    magic_link_sent: prospects.filter(p => matchesFilter(p, 'magic_link_sent')).length,
    trial_started: prospects.filter(p => matchesFilter(p, 'trial_started')).length,
  }

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Prospect Intake</h1>
        <p className="mt-4 text-gray-500">Loading prospects...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Prospect Intake</h1>
        <p className="mt-4 text-red-600">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prospect Intake</h1>
          <p className="text-gray-500 text-sm mt-1">
            Add real prospects, generate trial links, track outreach.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
          data-testid="add-prospect-btn"
        >
          + Add Prospect
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {([
          ['all', 'All'],
          ['not_contacted', 'Not Contacted'],
          ['magic_link_sent', 'Magic Link Sent'],
          ['trial_started', 'Trial Started'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilterTab(key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filterTab === key
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {label} ({tabCounts[key]})
          </button>
        ))}
      </div>

      {/* Prospect table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No prospects match this filter.</div>
        ) : (
          <table className="w-full text-sm" data-testid="prospects-table">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Stage</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Age</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(prospect => (
                <tr key={prospect.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{prospect.name}</td>
                  <td className="px-4 py-3 text-gray-600">{prospect.email}</td>
                  <td className="px-4 py-3 text-gray-500">{prospect.phone || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[prospect.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {prospect.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {prospect.follow_up_stage ?? '0'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {daysSince(prospect.created_at)}
                  </td>
                  <td className="px-4 py-3 space-x-2">
                    <button
                      onClick={() => generateTrialLink(prospect)}
                      disabled={generatingLink === prospect.id}
                      className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 font-medium disabled:opacity-50 transition-colors"
                      data-testid={`generate-link-btn-${prospect.id}`}
                    >
                      {generatingLink === prospect.id ? '...' : 'Generate Trial Link'}
                    </button>
                    {prospect.status === 'new' && (
                      <button
                        onClick={() => markContacted(prospect)}
                        disabled={markingContacted === prospect.id}
                        className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 font-medium disabled:opacity-50 transition-colors"
                        data-testid={`mark-contacted-btn-${prospect.id}`}
                      >
                        {markingContacted === prospect.id ? '...' : 'Mark Contacted'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-400">
          {filtered.length} of {prospects.length} prospects
        </div>
      </div>

      {/* Add Prospect Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="add-prospect-modal">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Prospect</h2>
            {addError && (
              <div className="mb-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{addError}</div>
            )}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Jane Smith"
                  data-testid="add-prospect-name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="jane@realtybrokerage.com"
                  data-testid="add-prospect-email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={addForm.phone}
                  onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="+1 555 123 4567"
                  data-testid="add-prospect-phone"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => { setShowAddModal(false); setAddError(null) }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={addProspect}
                disabled={addSubmitting || !addForm.name.trim() || !addForm.email.trim()}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                data-testid="add-prospect-submit"
              >
                {addSubmitting ? 'Adding...' : 'Add Prospect'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy Link Dialog */}
      {linkDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="link-dialog">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Trial Activation Link</h2>
            <p className="text-sm text-gray-500 mb-4">
              Send this link to <span className="font-medium">{linkDialog.email}</span>
            </p>
            <div className="bg-gray-50 border rounded-lg p-3 text-xs text-gray-800 break-all font-mono mb-4" data-testid="magic-link-url">
              {linkDialog.url}
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setLinkDialog(null); setCopied(false) }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Close
              </button>
              <button
                onClick={() => copyToClipboard(linkDialog.url)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
                data-testid="copy-link-btn"
              >
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
