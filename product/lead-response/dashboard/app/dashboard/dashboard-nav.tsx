'use client'

import { useEffect, useState } from 'react'
import TrialBadge from '@/components/dashboard/trial-badge'

interface AgentInfo {
  plan_tier: string | null
  trial_ends_at: string | null
  pilot_expires_at: string | null
}

export function DashboardNav() {
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null)

  useEffect(() => {
    fetch('/api/agents/profile')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.agent) {
          setAgentInfo({
            plan_tier: data.agent.plan_tier || null,
            trial_ends_at: data.agent.trial_ends_at || null,
            pilot_expires_at: data.agent.pilot_expires_at || null
          })
        }
      })
      .catch(() => {})
  }, [])

  return (
    <nav data-testid="dashboard-nav" className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <a href="/dashboard" aria-label="Go to dashboard home" className="text-xl font-bold text-slate-900 dark:text-white">
              LeadFlow AI
            </a>
            <div className="hidden md:flex items-center gap-4">
              <a href="/dashboard" aria-label="Go to lead feed" data-testid="nav-link-feed" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">Lead Feed</a>
              <a href="/dashboard/history" aria-label="Go to lead history" data-testid="nav-link-history" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">History</a>
              <a href="/dashboard/analytics" aria-label="Go to dashboard analytics" data-testid="nav-link-analytics" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">Analytics</a>
              <a href="/admin/simulator" aria-label="Go to lead response simulator" data-testid="nav-link-simulator" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">Simulator</a>
              <a href="/settings" aria-label="Go to settings" data-testid="nav-link-settings" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">Settings</a>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {agentInfo && (
              <TrialBadge 
                planTier={agentInfo.plan_tier} 
                trialEndsAt={agentInfo.trial_ends_at}
                pilotExpiresAt={agentInfo.pilot_expires_at}
              />
            )}
            <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
            <span className="text-sm text-slate-600 dark:text-slate-400">System Online</span>
          </div>
        </div>
      </div>
    </nav>
  )
}
