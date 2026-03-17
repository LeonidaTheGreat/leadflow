'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Loader2 } from 'lucide-react'

interface PilotMetric {
  agentId: string
  name: string
  email: string
  planTier: string
  lastLogin: string | null
  sessionsLast7d: number
  topPage: string | null
  inactiveHours: number | null
  atRisk: boolean
}

interface PilotUsageResponse {
  pilots: PilotMetric[]
  generatedAt: string
}

export function PilotEngagementMetrics() {
  const [pilots, setPilots] = useState<PilotMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPilotUsage = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/dashboard/pilot-metrics')

        if (!response.ok) {
          throw new Error(`Failed to fetch pilot metrics: ${response.statusText}`)
        }

        const data: PilotUsageResponse = await response.json()
        setPilots(data.pilots)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load pilot metrics'
        setError(message)
        console.error('Error fetching pilot metrics:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPilotUsage()
  }, [])

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatInactiveHours = (hours: number | null) => {
    if (hours === null) return '-'
    if (hours < 24) return `${hours}h`
    return `${Math.floor(hours / 24)}d`
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pilot Engagement Metrics</CardTitle>
          <CardDescription>
            Session activity and engagement data for pilot agents
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-900">
            <AlertCircle className="h-5 w-5" />
            Error Loading Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-800">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (pilots.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pilot Engagement Metrics</CardTitle>
          <CardDescription>
            Session activity and engagement data for pilot agents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No pilot data available yet
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pilot Engagement Metrics</CardTitle>
        <CardDescription>
          Real-time session activity and engagement data for {pilots.length} pilot agent{pilots.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative w-full overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2 font-semibold">Agent</th>
                <th className="text-left py-2 px-2 font-semibold">Email</th>
                <th className="text-left py-2 px-2 font-semibold">Last Login</th>
                <th className="text-center py-2 px-2 font-semibold">Sessions (7d)</th>
                <th className="text-left py-2 px-2 font-semibold">Top Page</th>
                <th className="text-center py-2 px-2 font-semibold">Inactive</th>
                <th className="text-center py-2 px-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {pilots.map((pilot) => (
                <tr key={pilot.agentId} className="border-b hover:bg-muted/50">
                  <td className="py-2 px-2 font-medium">{pilot.name}</td>
                  <td className="py-2 px-2 text-muted-foreground text-xs truncate">
                    {pilot.email}
                  </td>
                  <td className="py-2 px-2 text-xs">{formatDate(pilot.lastLogin)}</td>
                  <td className="py-2 px-2 text-center font-medium">
                    {pilot.sessionsLast7d}
                  </td>
                  <td className="py-2 px-2 text-xs">
                    {pilot.topPage ? (
                      <code className="bg-muted px-2 py-1 rounded text-xs">
                        {pilot.topPage}
                      </code>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="py-2 px-2 text-center text-xs">
                    {formatInactiveHours(pilot.inactiveHours)}
                  </td>
                  <td className="py-2 px-2 text-center">
                    {pilot.atRisk ? (
                      <span className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                        At Risk
                      </span>
                    ) : (
                      <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        Active
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
