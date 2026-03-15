'use client'

import { useState, useEffect } from 'react'
import { Mail, Send, Copy, Check, AlertCircle, Loader2, Calendar, User, MessageSquare } from 'lucide-react'

interface PilotInvite {
  id: string
  email: string
  name: string
  status: 'pending' | 'accepted' | 'expired'
  invited_at: string
  accepted_at?: string
  message?: string
}

interface ApiResponse {
  success: boolean
  inviteUrl?: string
  agentId?: string
  expiresAt?: string
  error?: string
}

interface ListResponse {
  invites?: PilotInvite[]
  error?: string
}

export default function AdminInvitePage() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [copiedUrl, setCopiedUrl] = useState(false)

  const [invites, setInvites] = useState<PilotInvite[]>([])
  const [loadingInvites, setLoadingInvites] = useState(true)
  const [adminToken, setAdminToken] = useState<string | null>(null)

  // Get admin token from localStorage or prompt
  useEffect(() => {
    const stored = localStorage.getItem('admin_token')
    if (stored) {
      setAdminToken(stored)
    } else {
      const token = prompt('Enter admin token (ADMIN_SECRET):')
      if (token) {
        localStorage.setItem('admin_token', token)
        setAdminToken(token)
      }
    }
  }, [])

  // Load invites on mount
  useEffect(() => {
    if (adminToken) {
      loadInvites()
    }
  }, [adminToken])

  async function loadInvites() {
    if (!adminToken) return

    setLoadingInvites(true)
    try {
      const response = await fetch('/api/admin/invite-pilot?action=list', {
        method: 'GET',
        headers: {
          'x-admin-token': adminToken,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('admin_token')
          setAdminToken(null)
          return
        }
        throw new Error('Failed to load invites')
      }

      const data: ListResponse = await response.json()
      if (data.invites) {
        setInvites(data.invites)
      }
    } catch (err) {
      console.error('Error loading invites:', err)
    } finally {
      setLoadingInvites(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)
    setInviteUrl(null)

    try {
      if (!adminToken) {
        throw new Error('Admin token not set')
      }

      const response = await fetch('/api/admin/invite-pilot', {
        method: 'POST',
        headers: {
          'x-admin-token': adminToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          message: message.trim() || undefined
        })
      })

      const data: ApiResponse = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to send invite')
      }

      setSuccess(true)
      setInviteUrl(data.inviteUrl || null)
      setExpiresAt(data.expiresAt || null)

      // Clear form
      setEmail('')
      setName('')
      setMessage('')

      // Reload invites list
      await loadInvites()

      // Reset success message after 5 seconds
      setTimeout(() => {
        setSuccess(false)
      }, 5000)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  function copyUrlToClipboard() {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl)
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    }
  }

  if (!adminToken) {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex gap-3">
              <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="font-semibold text-yellow-900">Authentication Required</h3>
                <p className="text-yellow-700 mt-1">Please provide your admin token to continue.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Mail className="text-emerald-400" size={32} />
            <h1 className="text-3xl font-bold text-white">Invite Pilot Agent</h1>
          </div>
          <p className="text-slate-400">Send direct invites to recruit pilot agents without requiring email verification.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Invite Form */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Send Invite</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
                    Email Address *
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@realtypro.com"
                    disabled={loading}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Smith"
                    disabled={loading}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Message */}
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-slate-300 mb-1">
                    Personal Note (optional)
                  </label>
                  <textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Hey Jane — I think LeadFlow would be a great fit for your team."
                    maxLength={500}
                    disabled={loading}
                    rows={3}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 resize-none"
                  />
                  <p className="text-xs text-slate-500 mt-1">Max 500 characters</p>
                </div>

                {/* Error */}
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded p-3">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                {/* Success */}
                {success && inviteUrl && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded p-3">
                    <p className="text-sm text-emerald-400">✅ Invite sent! Email is on its way.</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded font-medium transition"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {loading ? 'Sending...' : 'Send Invite'}
                </button>
              </form>
            </div>
          </div>

          {/* Results & Invite List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Invite URL Result */}
            {success && inviteUrl && (
              <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-emerald-400 mb-3">Magic Link Generated</h3>
                <div className="space-y-3">
                  <div className="bg-slate-800 rounded p-3">
                    <p className="text-xs text-slate-400 mb-2">Copy this for manual delivery (WhatsApp, SMS, etc.):</p>
                    <div className="flex gap-2">
                      <code className="flex-1 text-xs text-slate-300 break-all font-mono">{inviteUrl}</code>
                      <button
                        onClick={copyUrlToClipboard}
                        className="flex-shrink-0 p-2 hover:bg-slate-700 rounded transition"
                        title="Copy link"
                      >
                        {copiedUrl ? (
                          <Check size={16} className="text-emerald-400" />
                        ) : (
                          <Copy size={16} className="text-slate-400" />
                        )}
                      </button>
                    </div>
                  </div>
                  {expiresAt && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Calendar size={14} />
                      Expires: {new Date(expiresAt).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Invites List */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Recent Invites</h2>

              {loadingInvites ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-slate-400" />
                </div>
              ) : invites.length === 0 ? (
                <p className="text-slate-400 text-sm py-8 text-center">No invites sent yet.</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {invites.map((invite) => (
                    <div key={invite.id} className="bg-slate-700/50 rounded p-3 border border-slate-600">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white text-sm">{invite.name}</p>
                          <p className="text-xs text-slate-400 truncate">{invite.email}</p>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                          invite.status === 'accepted'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : invite.status === 'pending'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-slate-500/20 text-slate-400'
                        }`}>
                          {invite.status}
                        </div>
                      </div>

                      {invite.message && (
                        <div className="mb-2 text-xs text-slate-400 bg-slate-800/50 rounded p-2 italic">
                          "{invite.message}"
                        </div>
                      )}

                      <div className="flex gap-4 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <Calendar size={12} />
                          Invited: {new Date(invite.invited_at).toLocaleDateString()}
                        </div>
                        {invite.accepted_at && (
                          <div className="flex items-center gap-1">
                            <Check size={12} />
                            Accepted: {new Date(invite.accepted_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
