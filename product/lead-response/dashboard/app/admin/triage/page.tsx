'use client'

import { useEffect, useState } from 'react'

interface Analysis {
  id: string
  name: string
  status: string
  priority: string
  phase?: string
  recommendation: string | null
  reasoning: string[]
}

interface Summary {
  total: number
  stuck: number
  by_status: {
    needs_merge: number
    not_started: number
    in_progress: number
    stuck: number
  }
  by_recommendation: Record<string, number>
}

export default function TriagePage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [filter, setFilter] = useState<string>('ALL')

  useEffect(() => {
    async function fetchTriageData() {
      try {
        const response = await fetch('/api/admin/triage-use-cases')
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`)
        }
        const data = await response.json()
        if (!data.success) {
          throw new Error(data.error || 'Unknown error')
        }
        setSummary(data.summary)
        setAnalyses(data.analyses)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchTriageData()
  }, [])

  const filteredAnalyses = filter === 'ALL'
    ? analyses
    : analyses.filter(a => a.recommendation === filter)

  const recommendationColors: Record<string, string> = {
    'START': 'bg-green-100 text-green-800',
    'MERGE': 'bg-blue-100 text-blue-800',
    'ESCALATE': 'bg-red-100 text-red-800',
    'REVIEW': 'bg-yellow-100 text-yellow-800',
    'CONTINUE': 'bg-cyan-100 text-cyan-800',
    'BACKLOG': 'bg-gray-100 text-gray-800',
    'DEPRECATE': 'bg-orange-100 text-orange-800',
  }

  const priorityColors: Record<string, string> = {
    'critical': 'text-red-600 font-bold',
    'high': 'text-orange-600 font-semibold',
    'medium': 'text-yellow-600',
    'low': 'text-gray-600',
    '1': 'text-red-600 font-bold',
    '2': 'text-orange-600 font-semibold',
    '3': 'text-yellow-600',
    '4': 'text-gray-600',
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">Use Case Triage</h1>
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading triage data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">Use Case Triage</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-8">
            <h2 className="text-xl font-semibold text-red-700 mb-2">Error Loading Data</h2>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Use Case Triage</h1>
          <span className="text-sm text-gray-500">
            Generated: {new Date().toLocaleString()}
          </span>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-gray-800">{summary.total}</div>
              <div className="text-sm text-gray-600">Total Use Cases</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-red-600">{summary.stuck}</div>
              <div className="text-sm text-gray-600">Stuck Use Cases</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-orange-600">{summary.by_status.not_started}</div>
              <div className="text-sm text-gray-600">Not Started</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-blue-600">{summary.by_status.needs_merge}</div>
              <div className="text-sm text-gray-600">Needs Merge</div>
            </div>
          </div>
        )}

        {/* Filter Buttons */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'ALL'
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({analyses.length})
            </button>
            {Object.entries(summary?.by_recommendation || {}).map(([rec, count]) => (
              <button
                key={rec}
                onClick={() => setFilter(rec)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === rec
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {rec} ({count})
              </button>
            ))}
          </div>
        </div>

        {/* Analyses List */}
        <div className="space-y-4">
          {filteredAnalyses.map((analysis) => (
            <div
              key={analysis.id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {analysis.name}
                  </h3>
                  <p className="text-sm text-gray-500">ID: {analysis.id}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {analysis.recommendation && (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      recommendationColors[analysis.recommendation] || 'bg-gray-100 text-gray-800'
                    }`}>
                      {analysis.recommendation}
                    </span>
                  )}
                  <span className={`px-3 py-1 rounded-full text-xs font-medium bg-gray-100`}>
                    {analysis.status}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    priorityColors[analysis.priority] || 'text-gray-600'
                  }`}>
                    {analysis.priority}
                  </span>
                </div>
              </div>

              {analysis.reasoning.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Analysis:</h4>
                  <ul className="space-y-1">
                    {analysis.reasoning.map((reason, idx) => (
                      <li key={idx} className="text-sm text-gray-600 flex items-start">
                        <span className="text-gray-400 mr-2">•</span>
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.phase && (
                <div className="mt-3 text-sm text-gray-500">
                  Phase: {analysis.phase}
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredAnalyses.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No use cases match the selected filter.</p>
          </div>
        )}
      </div>
    </div>
  )
}
