'use client'

import { useState, useEffect } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Users,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Star,
  ThumbsUp,
  ThumbsDown,
  Minus,
} from 'lucide-react'

interface NPSStats {
  currentNPS: number
  responseCount: number
  previousPeriodCount: number
  promoters: number
  passives: number
  detractors: number
  recentResponses: any[]
}

interface ChurnRisk {
  id: string
  agent_id: string
  content: string
  created_at: string
  is_processed: boolean
  real_estate_agents?: {
    first_name: string
    last_name: string
    email: string
  }
}

export default function AdminNPSPage() {
  const [stats, setStats] = useState<NPSStats | null>(null)
  const [churnRisks, setChurnRisks] = useState<ChurnRisk[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'churn-risks'>('overview')

  const serviceRoleKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || ''

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      
      // Fetch NPS stats
      const statsRes = await fetch('/api/admin/nps', {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      })
      
      if (!statsRes.ok) {
        throw new Error('Failed to fetch NPS stats')
      }
      
      const statsData = await statsRes.json()
      setStats(statsData)

      // Fetch churn risks
      const churnRes = await fetch('/api/admin/nps?action=churn-risks', {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      })
      
      if (churnRes.ok) {
        const churnData = await churnRes.json()
        setChurnRisks(churnData.churnRisks || [])
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function markChurnRiskProcessed(feedbackId: string) {
    try {
      const res = await fetch('/api/admin/nps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ action: 'mark-processed', feedbackId }),
      })

      if (res.ok) {
        setChurnRisks(prev => prev.filter(r => r.id !== feedbackId))
      }
    } catch (error) {
      console.error('Error marking churn risk as processed:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading NPS data...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">Error</h2>
          <p className="text-red-600 dark:text-red-300">{error}</p>
        </div>
      </div>
    )
  }

  const unprocessedChurnRisks = churnRisks.filter(r => !r.is_processed)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                NPS & Feedback Dashboard
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Monitor agent satisfaction and churn risk
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'overview'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('churn-risks')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'churn-risks'
                    ? 'bg-red-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Churn Risks
                {unprocessedChurnRisks.length > 0 && (
                  <span className="bg-white text-red-500 text-xs font-bold px-2 py-0.5 rounded-full">
                    {unprocessedChurnRisks.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {activeTab === 'overview' && stats && (
          <>
            {/* NPS Score Card */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    NPS Score (90 days)
                  </h3>
                  <Star className="w-5 h-5 text-yellow-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-4xl font-bold ${
                    stats.currentNPS >= 30 ? 'text-emerald-600' :
                    stats.currentNPS >= 0 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {stats.currentNPS}
                  </span>
                  <span className="text-sm text-slate-500">
                    {stats.currentNPS >= 50 ? 'Excellent' :
                     stats.currentNPS >= 30 ? 'Good' :
                     stats.currentNPS >= 0 ? 'Average' : 'Poor'}
                  </span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Total Responses
                  </h3>
                  <MessageSquare className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-slate-900 dark:text-white">
                    {stats.responseCount}
                  </span>
                  {stats.previousPeriodCount > 0 && (
                    <span className={`text-sm flex items-center gap-1 ${
                      stats.responseCount >= stats.previousPeriodCount
                        ? 'text-emerald-600'
                        : 'text-red-600'
                    }`}>
                      {stats.responseCount >= stats.previousPeriodCount ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      vs last 90d
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Promoters
                  </h3>
                  <ThumbsUp className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-emerald-600">
                    {stats.promoters}
                  </span>
                  <span className="text-sm text-slate-500">
                    {stats.responseCount > 0
                      ? `${Math.round((stats.promoters / stats.responseCount) * 100)}%`
                      : '0%'}
                  </span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Detractors
                  </h3>
                  <ThumbsDown className="w-5 h-5 text-red-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-red-600">
                    {stats.detractors}
                  </span>
                  <span className="text-sm text-slate-500">
                    {stats.responseCount > 0
                      ? `${Math.round((stats.detractors / stats.responseCount) * 100)}%`
                      : '0%'}
                  </span>
                </div>
              </div>
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Response Breakdown
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-emerald-600 font-medium">Promoters (9-10)</span>
                      <span className="text-slate-600">{stats.promoters}</span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{
                          width: stats.responseCount > 0
                            ? `${(stats.promoters / stats.responseCount) * 100}%`
                            : '0%'
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-yellow-600 font-medium">Passives (7-8)</span>
                      <span className="text-slate-600">{stats.passives}</span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500 rounded-full"
                        style={{
                          width: stats.responseCount > 0
                            ? `${(stats.passives / stats.responseCount) * 100}%`
                            : '0%'
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-red-600 font-medium">Detractors (0-6)</span>
                      <span className="text-slate-600">{stats.detractors}</span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full"
                        style={{
                          width: stats.responseCount > 0
                            ? `${(stats.detractors / stats.responseCount) * 100}%`
                            : '0%'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Recent Responses
                </h3>
                {stats.recentResponses.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">
                    No responses yet
                  </p>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {stats.recentResponses.map((response: any) => (
                      <div
                        key={response.id}
                        className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                                response.score >= 9
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : response.score >= 7
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {response.score}
                              </span>
                              <span className="text-sm text-slate-600 dark:text-slate-400">
                                {response.real_estate_agents
                                  ? `${response.real_estate_agents.first_name} ${response.real_estate_agents.last_name}`
                                  : 'Unknown'}
                              </span>
                            </div>
                            {response.open_text && (
                              <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                                "{response.open_text}"
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-slate-400">
                            {new Date(response.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'churn-risks' && (
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Unprocessed Churn Risks
            </h3>
            {unprocessedChurnRisks.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400">
                  No unprocessed churn risks. Great job!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {unprocessedChurnRisks.map((risk) => (
                  <div
                    key={risk.id}
                    className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                          <span className="font-medium text-red-900 dark:text-red-100">
                            {risk.real_estate_agents
                              ? `${risk.real_estate_agents.first_name} ${risk.real_estate_agents.last_name}`
                              : 'Unknown Agent'}
                          </span>
                          <span className="text-sm text-red-600 dark:text-red-400">
                            {risk.real_estate_agents?.email}
                          </span>
                        </div>
                        <p className="text-red-800 dark:text-red-200 text-sm mb-2">
                          {risk.content}
                        </p>
                        <p className="text-xs text-red-500">
                          Detected {new Date(risk.created_at).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => markChurnRiskProcessed(risk.id)}
                        className="ml-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Mark Processed
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
