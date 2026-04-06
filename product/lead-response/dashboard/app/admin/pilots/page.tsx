'use client'

import { useEffect, useState } from 'react'

const TEST_EMAIL_PATTERNS = [/@test\.local$/i, /@test\.com$/i, /@example\.com$/i, /@qc\.local$/i]

function isTestAccount(email: string): boolean {
  return TEST_EMAIL_PATTERNS.some(p => p.test(email))
}

interface Pilot {
  id: string
  agent_id: string
  email: string
  first_name: string
  last_name: string
  stage: string
  stage_entered_at: string
  stuck_since: string | null
  last_contact_at: string | null
  last_contact_type: string | null
  support_notes: string | null
  pilot_cohort: string
  hours_in_stage: number
  is_stuck: boolean
}

export default function PilotsAdminPage() {
  const [pilots, setPilots] = useState<Pilot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPilot, setSelectedPilot] = useState<Pilot | null>(null)
  const [logNotes, setLogNotes] = useState('')
  const [logContactType, setLogContactType] = useState('email')
  const [newStage, setNewStage] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [showTestAccounts, setShowTestAccounts] = useState(false)

  const stageLabels: Record<string, string> = {
    signed_up: '📝 Signed Up',
    email_verified: '✉️ Email Verified',
    fub_connected: '🔗 FUB Connected',
    first_lead_responded: '📊 First Lead Responded',
    aha_moment: '🎯 Aha Moment',
    trial_started: '✅ Trial Started',
    paid: '💰 Paid',
  }

  const stageColors: Record<string, string> = {
    signed_up: 'bg-blue-100 text-blue-800',
    email_verified: 'bg-cyan-100 text-cyan-800',
    fub_connected: 'bg-green-100 text-green-800',
    first_lead_responded: 'bg-yellow-100 text-yellow-800',
    aha_moment: 'bg-purple-100 text-purple-800',
    trial_started: 'bg-indigo-100 text-indigo-800',
    paid: 'bg-emerald-100 text-emerald-800',
  }

  useEffect(() => {
    async function fetchPilots() {
      try {
        const response = await fetch('/api/admin/pilots')
        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`)
        }

        const result = await response.json()
        setPilots(result.pilots || [])
      } catch (err: any) {
        setError(err.message || 'Failed to fetch pilots')
      } finally {
        setLoading(false)
      }
    }

    fetchPilots()
  }, [])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleLogContact = async () => {
    if (!selectedPilot) return

    setActionLoading(true)
    try {
      const response = await fetch(`/api/admin/pilots/${selectedPilot.agent_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactType: logContactType,
          notes: logNotes,
          stageAdvanced: false,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to log contact: ${response.statusText}`)
      }

      const updated = await response.json()
      setPilots(
        pilots.map((p) => (p.agent_id === selectedPilot.agent_id ? updated.pilot : p))
      )
      setSelectedPilot(updated.pilot)
      setLogNotes('')
      alert('Contact logged successfully')
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  const handleAdvanceStage = async () => {
    if (!selectedPilot || !newStage) return

    setActionLoading(true)
    try {
      const response = await fetch(`/api/admin/pilots/${selectedPilot.agent_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newStage }),
      })

      if (!response.ok) {
        throw new Error(`Failed to advance stage: ${response.statusText}`)
      }

      const updated = await response.json()
      setPilots(
        pilots.map((p) => (p.agent_id === selectedPilot.agent_id ? updated.pilot : p))
      )
      setSelectedPilot(updated.pilot)
      setNewStage('')
      alert(`Stage advanced to ${newStage}. Email sent: ${updated.emailSent ? 'Yes' : 'No'}`)
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold">Pilot White-Glove Onboarding</h1>
        <p className="mt-4 text-gray-500">Loading pilots...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold">Pilot White-Glove Onboarding</h1>
        <p className="mt-4 text-red-600">Error: {error}</p>
      </div>
    )
  }

  const realPilots = pilots.filter(p => !isTestAccount(p.email))
  const testPilots = pilots.filter(p => isTestAccount(p.email))
  const visiblePilots = showTestAccounts ? pilots : realPilots

  return (
    <div className="p-8 bg-white min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Pilot White-Glove Onboarding</h1>
        <div className="flex items-center gap-4 mt-2 flex-wrap">
          <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
            realPilots.length === 0
              ? 'bg-red-100 text-red-700'
              : 'bg-green-100 text-green-700'
          }`}>
            {realPilots.length} real pilot{realPilots.length !== 1 ? 's' : ''}
          </div>
          {testPilots.length > 0 && (
            <div className="px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-500">
              {testPilots.length} test account{testPilots.length !== 1 ? 's' : ''}
            </div>
          )}
          {realPilots.length === 0 && (
            <p className="text-red-600 text-sm font-medium">
              No real pilots recruited yet — go to{' '}
              <a href="/admin/pilot-campaigns" className="underline">Recruitment Campaigns</a>
              {' '}to send invites.
            </p>
          )}
        </div>
        {testPilots.length > 0 && (
          <button
            onClick={() => setShowTestAccounts(v => !v)}
            className="mt-3 text-xs text-gray-400 underline"
          >
            {showTestAccounts ? 'Hide test accounts' : `Show ${testPilots.length} test account${testPilots.length !== 1 ? 's' : ''}`}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Pilots List */}
        <div className="lg:col-span-2">
          <div className="bg-gray-50 rounded-lg border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="text-left p-4 font-semibold">Name</th>
                    <th className="text-left p-4 font-semibold">Stage</th>
                    <th className="text-left p-4 font-semibold">Hours In Stage</th>
                    <th className="text-left p-4 font-semibold">Last Contact</th>
                    <th className="text-left p-4 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePilots.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-400">
                        No real pilots yet. <a href="/admin/pilot-campaigns" className="text-blue-500 underline">Start recruiting →</a>
                      </td>
                    </tr>
                  )}
                  {visiblePilots.map((pilot) => (
                    <tr
                      key={pilot.agent_id}
                      className={`border-b border-gray-200 hover:bg-gray-100 cursor-pointer ${
                        selectedPilot?.agent_id === pilot.agent_id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedPilot(pilot)}
                    >
                      <td className="p-4">
                        <div>
                          <p className="font-medium">
                            {pilot.first_name} {pilot.last_name}
                          </p>
                          <p className="text-gray-500 text-xs">{pilot.email}</p>
                          {isTestAccount(pilot.email) && (
                            <span className="text-xs bg-gray-200 text-gray-500 px-1 rounded">test</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${stageColors[pilot.stage] || 'bg-gray-100'}`}>
                          {stageLabels[pilot.stage] || pilot.stage}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {Math.round(pilot.hours_in_stage)}h
                          {pilot.is_stuck && <span className="text-red-500 font-bold">⚠️</span>}
                        </div>
                      </td>
                      <td className="p-4 text-gray-500 text-xs">
                        {pilot.last_contact_at
                          ? `${formatDate(pilot.last_contact_at)} (${pilot.last_contact_type})`
                          : 'No contact'}
                      </td>
                      <td className="p-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedPilot(pilot)
                          }}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Detail Panel */}
        {selectedPilot && (
          <div className="lg:col-span-1 bg-gray-50 rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-bold mb-4">
              {selectedPilot.first_name} {selectedPilot.last_name}
            </h2>

            {/* Current Stage */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">Current Stage</label>
              <div className={`px-3 py-2 rounded ${stageColors[selectedPilot.stage]}`}>
                {stageLabels[selectedPilot.stage]}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Entered {formatDate(selectedPilot.stage_entered_at)}
              </p>
            </div>

            {/* Advance Stage */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">Advance to Stage</label>
              <select
                value={newStage}
                onChange={(e) => setNewStage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-2"
              >
                <option value="">Select stage...</option>
                <option value="signed_up">Signed Up</option>
                <option value="email_verified">Email Verified</option>
                <option value="fub_connected">FUB Connected</option>
                <option value="first_lead_responded">First Lead Responded</option>
                <option value="aha_moment">Aha Moment</option>
                <option value="trial_started">Trial Started</option>
                <option value="paid">Paid</option>
              </select>
              <button
                onClick={handleAdvanceStage}
                disabled={!newStage || actionLoading}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-400"
              >
                {actionLoading ? 'Advancing...' : 'Advance & Send Email'}
              </button>
            </div>

            {/* Log Contact */}
            <div className="border-t pt-6">
              <h3 className="font-semibold mb-3 text-sm">Log Contact</h3>
              <select
                value={logContactType}
                onChange={(e) => setLogContactType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-3"
              >
                <option value="email">Email</option>
                <option value="call">Call</option>
                <option value="zoom">Zoom</option>
                <option value="slack">Slack</option>
              </select>
              <textarea
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
                placeholder="Notes about this interaction..."
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm h-24 mb-3"
              />
              <button
                onClick={handleLogContact}
                disabled={actionLoading}
                className="w-full px-3 py-2 bg-green-600 text-white rounded text-sm font-semibold hover:bg-green-700 disabled:bg-gray-400"
              >
                {actionLoading ? 'Logging...' : 'Log Contact'}
              </button>
            </div>

            {/* Support Notes */}
            {selectedPilot.support_notes && (
              <div className="border-t pt-6 mt-6">
                <h3 className="font-semibold mb-2 text-sm">Support Notes</h3>
                <div className="bg-white p-3 rounded text-xs text-gray-700 max-h-32 overflow-y-auto">
                  {selectedPilot.support_notes}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
