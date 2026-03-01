import * as React from 'react'
import { usePostHog } from '@/components/PostHogProvider'
import { BarChart3, Users, MousePointer, TrendingUp, RefreshCw, ExternalLink } from 'lucide-react'

interface ExperimentMetrics {
  variant: string
  impressions: number
  clicks: number
  conversions: number
  ctr: number
  conversionRate: number
}

interface ExperimentData {
  name: string
  key: string
  status: 'running' | 'completed' | 'draft'
  startDate: string
  variants: ExperimentMetrics[]
  totalUsers: number
  winner?: string
}

const MOCK_EXPERIMENTS: ExperimentData[] = [
  {
    name: 'Landing Page Headline V1',
    key: 'landing_page_headline_v1',
    status: 'running',
    startDate: '2024-02-20',
    totalUsers: 1247,
    variants: [
      { variant: 'control', impressions: 312, clicks: 89, conversions: 23, ctr: 28.5, conversionRate: 7.4 },
      { variant: 'benefit_focused', impressions: 311, clicks: 112, conversions: 31, ctr: 36.0, conversionRate: 10.0 },
      { variant: 'urgency_focused', impressions: 312, clicks: 98, conversions: 27, ctr: 31.4, conversionRate: 8.7 },
      { variant: 'social_proof', impressions: 312, clicks: 105, conversions: 29, ctr: 33.7, conversionRate: 9.3 }
    ]
  }
]

export function ExperimentDashboard() {
  const { posthog } = usePostHog()
  const [experiments] = React.useState<ExperimentData[]>(MOCK_EXPERIMENTS)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [selectedExperiment, setSelectedExperiment] = React.useState<string>(MOCK_EXPERIMENTS[0]?.key || '')

  const refreshData = async () => {
    setIsRefreshing(true)
    
    // In production, this would fetch real data from PostHog API
    // const data = await fetch('/api/experiments')
    
    // Track dashboard refresh
    if (posthog) {
      posthog.capture('experiment_dashboard_refreshed')
    }

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setIsRefreshing(false)
  }

  const currentExperiment = experiments.find(e => e.key === selectedExperiment)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getWinnerBadge = (variant: string, winner?: string) => {
    if (winner === variant) {
      return <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">Winner</span>
    }
    return null
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">A/B Test Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Monitor your experiments and analyze conversion performance
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={refreshData}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 border hover:bg-accent disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <a
              href="https://app.posthog.com/experiments"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open PostHog
            </a>
          </div>
        </div>

        {/* Experiment Selector */}
        <div className="bg-card border rounded-lg p-4">
          <label className="text-sm font-medium mb-2 block">Select Experiment</label>
          <select
            value={selectedExperiment}
            onChange={(e) => setSelectedExperiment(e.target.value)}
            className="w-full md:w-96 h-10 rounded-md border border-input bg-background px-3"
          >
            {experiments.map(exp => (
              <option key={exp.key} value={exp.key}>
                {exp.name} ({exp.status})
              </option>
            ))}
          </select>
        </div>

        {currentExperiment && (
          <>
            {/* Overview Cards */}
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-card border rounded-lg p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Users</p>
                    <p className="text-2xl font-bold">{currentExperiment.totalUsers.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-card border rounded-lg p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <MousePointer className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg CTR</p>
                    <p className="text-2xl font-bold">
                      {(currentExperiment.variants.reduce((acc, v) => acc + v.ctr, 0) / currentExperiment.variants.length).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-card border rounded-lg p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Conv. Rate</p>
                    <p className="text-2xl font-bold">
                      {(currentExperiment.variants.reduce((acc, v) => acc + v.conversionRate, 0) / currentExperiment.variants.length).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-card border rounded-lg p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Variants</p>
                    <p className="text-2xl font-bold">{currentExperiment.variants.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Experiment Status */}
            <div className="bg-card border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold">{currentExperiment.name}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Started: {currentExperiment.startDate} • Key: {currentExperiment.key}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(currentExperiment.status)}`}>
                  {currentExperiment.status.charAt(0).toUpperCase() + currentExperiment.status.slice(1)}
                </span>
              </div>
            </div>

            {/* Variants Table */}
            <div className="bg-card border rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-semibold">Variant Performance</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left py-3 px-6 text-sm font-medium">Variant</th>
                      <th className="text-right py-3 px-6 text-sm font-medium">Impressions</th>
                      <th className="text-right py-3 px-6 text-sm font-medium">Clicks</th>
                      <th className="text-right py-3 px-6 text-sm font-medium">CTR</th>
                      <th className="text-right py-3 px-6 text-sm font-medium">Conversions</th>
                      <th className="text-right py-3 px-6 text-sm font-medium">Conv. Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentExperiment.variants.map((variant, idx) => (
                      <tr key={variant.variant} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/50'}>
                        <td className="py-4 px-6">
                          <div className="flex items-center">
                            <span className="font-medium capitalize">{variant.variant.replace(/_/g, ' ')}</span>
                            {getWinnerBadge(variant.variant, currentExperiment.winner)}
                          </div>
                        </td>
                        <td className="text-right py-4 px-6">{variant.impressions.toLocaleString()}</td>
                        <td className="text-right py-4 px-6">{variant.clicks.toLocaleString()}</td>
                        <td className="text-right py-4 px-6">
                          <span className={`font-medium ${variant.ctr >= 30 ? 'text-green-600' : ''}`}>
                            {variant.ctr.toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-right py-4 px-6">{variant.conversions.toLocaleString()}</td>
                        <td className="text-right py-4 px-6">
                          <span className={`font-medium ${variant.conversionRate >= 9 ? 'text-green-600' : ''}`}>
                            {variant.conversionRate.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Chart Placeholder */}
            <div className="bg-card border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Conversion Rate Comparison</h3>
              <div className="h-64 flex items-end gap-4 justify-around">
                {currentExperiment.variants.map((variant) => (
                  <div key={variant.variant} className="flex flex-col items-center gap-2 flex-1">
                    <div 
                      className="w-full bg-primary/80 rounded-t-md transition-all duration-500 hover:bg-primary"
                      style={{ 
                        height: `${(variant.conversionRate / Math.max(...currentExperiment.variants.map(v => v.conversionRate))) * 200}px`,
                        maxWidth: '120px'
                      }}
                    />
                    <span className="text-sm font-medium capitalize">{variant.variant.replace(/_/g, ' ')}</span>
                    <span className="text-sm text-muted-foreground">{variant.conversionRate.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Setup Instructions */}
            <div className="bg-muted/50 border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">PostHog Experiment Setup</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="font-medium mb-2">1. Create Experiment in PostHog</p>
                  <code className="bg-background px-2 py-1 rounded text-xs">
                    https://app.posthog.com/experiments
                  </code>
                </div>
                <div>
                  <p className="font-medium mb-2">2. Experiment Key</p>
                  <code className="bg-background px-2 py-1 rounded">{currentExperiment.key}</code>
                </div>
                <div>
                  <p className="font-medium mb-2">3. Variants</p>
                  <div className="flex flex-wrap gap-2">
                    {currentExperiment.variants.map(v => (
                      <code key={v.variant} className="bg-background px-2 py-1 rounded">{v.variant}</code>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-medium mb-2">4. Primary Metric</p>
                  <p className="text-muted-foreground">conversion (custom event)</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ExperimentDashboard
