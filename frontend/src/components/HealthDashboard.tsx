import * as React from 'react'
import { SystemHealthGrid } from '@/components/SystemHealthGrid'
import { ArrowLeft, HeartPulse } from 'lucide-react'

interface HealthDashboardProps {
  onBack?: () => void
}

export function HealthDashboard({ onBack }: HealthDashboardProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 w-9 border border-slate-300 hover:bg-slate-50 transition-colors"
                  aria-label="Go back"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                  <HeartPulse className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Health Dashboard</h1>
                  <p className="text-xs text-slate-500">LeadFlow System Monitoring</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Monitoring
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SystemHealthGrid 
          autoRefresh={true}
          refreshInterval={30000}
        />

        {/* Additional Info */}
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {/* Quick Stats */}
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Monitoring Details</h3>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">●</span>
                <span>Checks run every 30 seconds automatically</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">●</span>
                <span>Response times over 500ms trigger warning status</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">●</span>
                <span>Failed checks automatically retry on next interval</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">●</span>
                <span>All timestamps are displayed in local time</span>
              </li>
            </ul>
          </div>

          {/* Alert Settings */}
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Alert Thresholds</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Healthy Response Time</span>
                <span className="text-sm font-medium text-slate-900">&lt; 500ms</span>
              </div>
              <div className="h-px bg-slate-200" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Warning Response Time</span>
                <span className="text-sm font-medium text-amber-600">500ms - 1000ms</span>
              </div>
              <div className="h-px bg-slate-200" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Critical Response Time</span>
                <span className="text-sm font-medium text-red-600">&gt; 1000ms or Error</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-xs text-slate-500">
            LeadFlow Health Dashboard • Auto-refreshes every 30 seconds
          </p>
        </div>
      </footer>
    </div>
  )
}

export default HealthDashboard
