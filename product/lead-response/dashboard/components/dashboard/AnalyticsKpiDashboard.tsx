'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Users, Send, CheckCircle, BarChart3, Clock } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { supabase } from '@/lib/supabase'
import {
  getMessagesPerDay,
  getDeliveryStats,
  getResponseRate,
  getSequenceCompletion,
  getLeadConversion,
  getAvgResponseTime,
} from '@/lib/analytics-queries'

// ============================================
// TYPES
// ============================================

interface KpiMetric {
  title: string
  value: string | number
  change?: number
  changeType?: 'increase' | 'decrease'
  unit?: string
  icon: React.ReactNode
  color: string
}

interface DashboardData {
  messagesPerDay: Array<{ date: string; count: number }>
  deliveryStats: { sent: number; delivered: number; failed: number; pending: number; error: any }
  responseRate: { totalSent: number; totalResponded: number; responseRate: number; error: any }
  sequenceCompletion: { started: number; completed: number; completionRate: number; error: any }
  leadConversion: { totalLeads: number; convertedLeads: number; conversionRate: number; error: any }
  responseTime: { avgResponseTime: number; medianResponseTime: number; error: any }
}

// ============================================
// COMPONENT
// ============================================

export function AnalyticsKpiDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<7 | 30 | 90>(30)

  useEffect(() => {
    fetchDashboardData()
  }, [timeRange])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [timeRange])

  async function fetchDashboardData() {
    try {
      setLoading(true)

      const [msgPerDay, delivery, response, sequence, conversion, respTime] = await Promise.all([
        getMessagesPerDay(timeRange),
        getDeliveryStats(timeRange),
        getResponseRate(timeRange),
        getSequenceCompletion(timeRange),
        getLeadConversion(timeRange),
        getAvgResponseTime(timeRange),
      ])

      setData({
        messagesPerDay: msgPerDay.data,
        deliveryStats: delivery,
        responseRate: response,
        sequenceCompletion: sequence,
        leadConversion: conversion,
        responseTime: respTime,
      })
    } catch (error) {
      console.error('Error fetching analytics data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !data) {
    return <LoadingSkeleton />
  }

  // Prepare metrics
  const metrics: KpiMetric[] = [
    {
      title: 'Messages Sent',
      value: data.messagesPerDay.reduce((sum, d) => sum + d.count, 0),
      unit: 'last 24h',
      icon: <Send className="w-5 h-5" />,
      color: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      title: 'Delivery Rate',
      value: data.deliveryStats.sent > 0 ? Math.round((data.deliveryStats.delivered / data.deliveryStats.sent) * 100) : 0,
      unit: '%',
      icon: <CheckCircle className="w-5 h-5" />,
      color: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      title: 'Response Rate',
      value: data.responseRate.responseRate,
      unit: '%',
      icon: <Users className="w-5 h-5" />,
      color: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      title: 'Sequence Completion',
      value: data.sequenceCompletion.completionRate,
      unit: '%',
      icon: <BarChart3 className="w-5 h-5" />,
      color: 'bg-amber-50 dark:bg-amber-900/20',
    },
    {
      title: 'Lead Conversion',
      value: data.leadConversion.conversionRate,
      unit: '%',
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'bg-pink-50 dark:bg-pink-900/20',
    },
    {
      title: 'Avg Response Time',
      value: data.responseTime.avgResponseTime,
      unit: 'min',
      icon: <Clock className="w-5 h-5" />,
      color: 'bg-cyan-50 dark:bg-cyan-900/20',
    },
  ]

  // Prepare chart data
  const deliveryChartData = [
    { name: 'Delivered', value: data.deliveryStats.delivered, fill: '#10b981' },
    { name: 'Sent', value: data.deliveryStats.sent - data.deliveryStats.delivered, fill: '#3b82f6' },
    { name: 'Failed', value: data.deliveryStats.failed, fill: '#ef4444' },
    { name: 'Pending', value: data.deliveryStats.pending, fill: '#f59e0b' },
  ].filter((d) => d.value > 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Analytics</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            KPI dashboard with real-time metrics. Updates every 5 minutes.
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2">
          {[7, 30, 90].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range as 7 | 30 | 90)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600'
              }`}
            >
              {range}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric, idx) => (
          <KpiCard key={idx} metric={metric} />
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Messages Per Day Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Messages Sent Trend</h3>
          {data.messagesPerDay.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.messagesPerDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    color: '#f1f5f9',
                  }}
                />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-slate-400">
              No data available
            </div>
          )}
        </div>

        {/* Delivery Status Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Delivery Status</h3>
          {deliveryChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={deliveryChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {deliveryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    color: '#f1f5f9',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-slate-400">
              No data available
            </div>
          )}
        </div>

        {/* Conversion Funnel */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Conversion Funnel</h3>
          <div className="space-y-4">
            <FunnelBar label="Total Leads" value={data.leadConversion.totalLeads} width={100} color="bg-blue-500" />
            <FunnelBar label="Converted" value={data.leadConversion.convertedLeads} width={(data.leadConversion.convertedLeads / Math.max(data.leadConversion.totalLeads, 1)) * 100} color="bg-emerald-500" />
          </div>
        </div>

        {/* Key Metrics Summary */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Summary</h3>
          <div className="space-y-3">
            <MetricRow label="Messages Sent" value={data.messagesPerDay.reduce((sum, d) => sum + d.count, 0)} />
            <MetricRow label="Delivery Success" value={`${data.deliveryStats.delivered}/${data.deliveryStats.sent}`} />
            <MetricRow label="Responses" value={`${data.responseRate.totalResponded}/${data.responseRate.totalSent}`} />
            <MetricRow label="Sequences Completed" value={`${data.sequenceCompletion.completed}/${data.sequenceCompletion.started}`} />
            <MetricRow label="Median Response Time" value={`${data.responseTime.medianResponseTime}m`} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          ✨ <strong>Ready for live data:</strong> All metrics are powered by real Supabase queries. Connect PostHog events to enable advanced funnels and user behavior tracking.
        </p>
      </div>
    </div>
  )
}

// ============================================
// SUBCOMPONENTS
// ============================================

function KpiCard({ metric }: { metric: KpiMetric }) {
  return (
    <div className={`${metric.color} border border-slate-200 dark:border-slate-800 rounded-lg p-6 transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{metric.title}</p>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{metric.value}</p>
            {metric.unit && <span className="text-sm text-slate-500 dark:text-slate-400">{metric.unit}</span>}
          </div>

          {metric.change !== undefined && (
            <div className={`mt-2 flex items-center gap-1 text-sm font-medium ${metric.changeType === 'increase' ? 'text-emerald-600' : 'text-red-600'}`}>
              {metric.changeType === 'increase' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {Math.abs(metric.change)}% vs last period
            </div>
          )}
        </div>

        <div className="text-slate-400 dark:text-slate-600">{metric.icon}</div>
      </div>
    </div>
  )
}

function FunnelBar({ label, value, width, color }: { label: string; value: number; width: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</span>
        <span className="text-sm font-bold text-slate-900 dark:text-white">{value}</span>
      </div>
      <div className="bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
        <div className={`${color} h-full transition-all duration-300`} style={{ width: `${Math.min(width, 100)}%` }} />
      </div>
    </div>
  )
}

function MetricRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700 last:border-0">
      <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-slate-900 dark:text-white">{value}</span>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded w-48 mb-6" />

      {/* KPI cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-slate-200 dark:bg-slate-700 rounded-lg p-6 h-24" />
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-slate-200 dark:bg-slate-700 rounded-lg p-6 h-64" />
        ))}
      </div>
    </div>
  )
}
