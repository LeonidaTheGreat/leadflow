'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { DashboardStats } from '@/lib/types'

export function StatsCards() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    try {
      // Get all stats (no auth filter for MVP)
      const { data: allStats } = await supabase
        .from('dashboard_stats')
        .select('*')

      // Sum up stats across all agents
      const totals = allStats?.reduce((acc: any, curr: any) => ({
        new_leads: (acc.new_leads || 0) + (curr.new_leads || 0),
        qualified_leads: (acc.qualified_leads || 0) + (curr.qualified_leads || 0),
        responded_leads: (acc.responded_leads || 0) + (curr.responded_leads || 0),
        leads_today: (acc.leads_today || 0) + (curr.leads_today || 0),
        total_leads: (acc.total_leads || 0) + (curr.total_leads || 0),
      }), { new_leads: 0, qualified_leads: 0, responded_leads: 0, leads_today: 0, total_leads: 0 })

      setStats(totals || null)
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800 animate-pulse">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20 mb-2"></div>
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
          </div>
        ))}
      </div>
    )
  }

  const cards = [
    { label: 'New Leads', value: stats?.new_leads || 0, color: 'text-blue-600' },
    { label: 'Qualified', value: stats?.qualified_leads || 0, color: 'text-emerald-600' },
    { label: 'Responded', value: stats?.responded_leads || 0, color: 'text-purple-600' },
    { label: 'Today', value: stats?.leads_today || 0, color: 'text-amber-600' },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{card.label}</p>
          <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  )
}
