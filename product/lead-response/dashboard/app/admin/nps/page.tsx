/**
 * Admin NPS Dashboard Page
 * 
 * Design Reference: /docs/DESIGN-NPS-AGENT-FEEDBACK.md
 * 
 * Admin view for NPS analytics, responses, and churn risk alerts.
 * This is a DESIGN MOCKUP / REFERENCE IMPLEMENTATION.
 */

import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Download,
  CheckCircle,
} from 'lucide-react'

// Mock data for design reference
const MOCK_NPS_DATA = {
  currentScore: 42,
  scoreChange: 12,
  responseRate: 67,
  totalResponses: 45,
  breakdown: {
    promoters: 45, // percentage
    passives: 23,
    detractors: 18,
    unresponded: 14,
  },
  trend: [
    { month: 'Jan', score: 25 },
    { month: 'Feb', score: 32 },
    { month: 'Mar', score: 28 },
    { month: 'Apr', score: 35 },
    { month: 'May', score: 38 },
    { month: 'Jun', score: 42 },
  ],
}

const MOCK_RESPONSES = [
  { id: '1', score: 10, agent: 'Sarah Chen', response: 'Game changer for my business', date: '2h ago', isDetractor: false },
  { id: '2', score: 9, agent: 'Mike Ross', response: 'Love the AI responses', date: '5h ago', isDetractor: false },
  { id: '3', score: 6, agent: 'John Davis', response: 'SMS delays sometimes', date: '1d ago', isDetractor: true },
  { id: '4', score: 3, agent: 'Lisa Wong', response: 'Too expensive for my volume', date: '2d ago', isDetractor: true },
  { id: '5', score: 10, agent: 'Tom Bradley', response: 'Closed 3 deals because of this', date: '3d ago', isDetractor: false },
  { id: '6', score: 8, agent: 'Amy Chen', response: 'Great tool, wish it had more integrations', date: '4d ago', isDetractor: false },
]

const MOCK_CHURN_RISKS = [
  { id: '1', agent: 'John Davis', score: 6, date: '1d ago', contacted: false },
  { id: '2', agent: 'Lisa Wong', score: 3, date: '2d ago', contacted: false },
]

export default function AdminNPSPage() {
  const getScoreBadgeClass = (score: number) => {
    if (score >= 9) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
    if (score >= 7) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  }

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-emerald-600" />
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-600" />
    return <Minus className="w-4 h-4 text-slate-500" />
  }

  const getTrendClass = (change: number) => {
    if (change > 0) return 'text-emerald-600'
    if (change < 0) return 'text-red-600'
    return 'text-slate-500'
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <nav className="text-sm text-slate-500 mb-1">
                Admin <span className="mx-2">→</span>{' '}
                <span className="font-medium text-slate-900 dark:text-white">
                  NPS Dashboard
                </span>
              </nav>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                NPS Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                admin@leadflow.ai
              </span>
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-medium text-sm">
                A
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Score Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* NPS Score */}
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5">
            <p className="text-sm text-slate-500 mb-2">NPS Score</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold text-slate-900 dark:text-white">
                {MOCK_NPS_DATA.currentScore}
              </span>
            </div>
            <div className={`flex items-center gap-1 mt-2 text-sm ${getTrendClass(MOCK_NPS_DATA.scoreChange)}`}>
              {getTrendIcon(MOCK_NPS_DATA.scoreChange)}
              <span>{Math.abs(MOCK_NPS_DATA.scoreChange)} vs last 90d</span>
            </div>
          </div>

          {/* Response Rate */}
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5">
            <p className="text-sm text-slate-500 mb-2">Response Rate</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-slate-900 dark:text-white">
                {MOCK_NPS_DATA.responseRate}%
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-2">
              {MOCK_NPS_DATA.totalResponses} responses
            </p>
          </div>

          {/* Promoters */}
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5">
            <p className="text-sm text-slate-500 mb-2">Promoters</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-emerald-600">
                {MOCK_NPS_DATA.breakdown.promoters}%
              </span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${MOCK_NPS_DATA.breakdown.promoters}%` }}
              />
            </div>
          </div>

          {/* Detractors */}
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5">
            <p className="text-sm text-slate-500 mb-2">Detractors</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-red-600">
                {MOCK_NPS_DATA.breakdown.detractors}%
              </span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
              <div
                className="h-full bg-red-500 rounded-full"
                style={{ width: `${MOCK_NPS_DATA.breakdown.detractors}%` }}
              />
            </div>
          </div>
        </div>

        {/* Breakdown & Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Breakdown */}
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
              Breakdown
            </h3>
            <div className="space-y-4">
              {/* Promoters */}
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-700 dark:text-slate-300">
                    Promoters (9-10)
                  </span>
                  <span className="font-medium text-emerald-600">
                    {MOCK_NPS_DATA.breakdown.promoters}%
                  </span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${MOCK_NPS_DATA.breakdown.promoters}%` }}
                  />
                </div>
              </div>

              {/* Passives */}
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-700 dark:text-slate-300">
                    Passives (7-8)
                  </span>
                  <span className="font-medium text-amber-600">
                    {MOCK_NPS_DATA.breakdown.passives}%
                  </span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full"
                    style={{ width: `${MOCK_NPS_DATA.breakdown.passives}%` }}
                  />
                </div>
              </div>

              {/* Detractors */}
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-700 dark:text-slate-300">
                    Detractors (0-6)
                  </span>
                  <span className="font-medium text-red-600">
                    {MOCK_NPS_DATA.breakdown.detractors}%
                  </span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full"
                    style={{ width: `${MOCK_NPS_DATA.breakdown.detractors}%` }}
                  />
                </div>
              </div>

              {/* Unresponded */}
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-700 dark:text-slate-300">
                    Unresponded
                  </span>
                  <span className="font-medium text-slate-500">
                    {MOCK_NPS_DATA.breakdown.unresponded}%
                  </span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-300 dark:bg-slate-700 rounded-full"
                    style={{ width: `${MOCK_NPS_DATA.breakdown.unresponded}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Trend Chart Placeholder */}
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
              NPS Trend (6 months)
            </h3>
            <div className="h-48 flex items-end justify-between gap-2">
              {MOCK_NPS_DATA.trend.map((point) => (
                <div key={point.month} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-emerald-500/20 rounded-t"
                    style={{ height: `${(point.score / 60) * 100}%` }}
                  >
                    <div
                      className="w-full bg-emerald-500 rounded-t transition-all"
                      style={{ height: '100%' }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 mt-2">{point.month}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-4 text-center">
              Use Recharts or similar for production implementation
            </p>
          </div>
        </div>

        {/* Churn Risk Alerts */}
        {MOCK_CHURN_RISKS.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="font-semibold text-red-900 dark:text-red-100">
                Churn Risk Alerts (Action Required)
              </h3>
            </div>
            <p className="text-sm text-red-800 dark:text-red-200 mb-4">
              {MOCK_CHURN_RISKS.length} detractor{MOCK_CHURN_RISKS.length > 1 ? 's' : ''} need follow-up within 48 hours:
            </p>
            <div className="space-y-2">
              {MOCK_CHURN_RISKS.map((risk) => (
                <div
                  key={risk.id}
                  className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-lg p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-sm font-medium ${getScoreBadgeClass(risk.score)}`}>
                      {risk.score}
                    </span>
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {risk.agent}
                    </span>
                    <span className="text-xs text-slate-400">
                      Submitted {risk.date}
                    </span>
                  </div>
                  <button className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    Mark as contacted
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Responses */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              Recent Responses
            </h3>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Agent
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Response
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {MOCK_RESPONSES.map((response) => (
                  <tr
                    key={response.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded text-sm font-medium ${getScoreBadgeClass(
                            response.score
                          )}`}
                        >
                          {response.score}
                        </span>
                        {response.isDetractor && (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-700 dark:text-slate-300">
                      {response.agent}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-400 max-w-md truncate">
                      {response.response}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-500">
                      {response.date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800">
            <button className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
              Load more...
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
