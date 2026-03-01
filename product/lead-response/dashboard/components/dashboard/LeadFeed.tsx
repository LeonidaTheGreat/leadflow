'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { LeadCard } from './LeadCard'
import type { Lead } from '@/lib/types'

export function LeadFeed() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchLeads()
    
    // Subscribe to real-time updates
    const subscription = supabase
      .channel('leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        fetchLeads()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [filter])

  async function fetchLeads() {
    try {
      setLoading(true)

      let query = supabase
        .from('lead_summary')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query

      if (error) throw error
      setLeads(data || [])
    } catch (error) {
      console.error('Error fetching leads:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-32 animate-pulse"></div>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32 mb-2"></div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-48"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Recent Leads ({leads.length})
        </h2>
        <select 
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-sm px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        >
          <option value="all">All Status</option>
          <option value="new">New</option>
          <option value="qualified">Qualified</option>
          <option value="responded">Responded</option>
          <option value="nurturing">Nurturing</option>
          <option value="appointment">Appointment</option>
        </select>
      </div>
      
      {leads.length === 0 ? (
        <div className="p-8 text-center text-slate-500 dark:text-slate-400">
          <p>No leads found</p>
          <p className="text-sm mt-1">New leads will appear here when they come in</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      )}
    </div>
  )
}
