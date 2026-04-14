/**
 * GET /api/admin/metrics/aha-moment
 *
 * Returns the "Aha Moment" activation metric for trial users:
 * - % of trial users who completed simulator within 3 days of signup
 * - Target: ≥80%
 *
 * Auth: LEADFLOW_API_KEY bearer token (admin-only)
 *
 * PRD: docs/prd/PRD-TRIAL-AHA-MOMENT.md — R5
 */

import { NextRequest, NextResponse } from 'next/server'
import { postgrestAdmin } from '@/lib/db'
import { logger } from '@/lib/logger'

function verifyAdminAuth(request: NextRequest): boolean {
  const apiKey = process.env.LEADFLOW_API_KEY
  if (!apiKey) return false

  const authHeader = request.headers.get('authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) return false

  const provided = authHeader.slice(7).trim()
  return provided === apiKey
}

interface AhaMomentMetrics {
  total_trial_agents: number
  completed_within_3_days: number
  aha_moment_rate: number
  target_rate: number
  target_met: boolean
  period_days: number
  as_of: string
}

interface AgentWithSimulation {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  trial_start_date: string | null
  created_at: string
  simulation_status: string | null
  simulation_completed_at: string | null
}

/**
 * GET /api/admin/metrics/aha-moment
 *
 * Query params:
 *   period_days (integer, default 30) — lookback period for trial signups
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const periodDays = Math.max(1, parseInt(searchParams.get('period_days') ?? '30', 10) || 30)
  const now = new Date()
  const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000)

  try {
    // Query: Agents who started trial in the lookback period
    // First get agents with trial_start_date within period
    const { data: agentsByTrialDate, error: err1 } = await postgrestAdmin
      .from('real_estate_agents')
      .select(`
        id,
        email,
        first_name,
        last_name,
        trial_start_date,
        created_at,
        onboarding_simulations!left(status, created_at)
      `)
      .eq('plan_tier', 'trial')
      .gte('trial_start_date', periodStart.toISOString())

    if (err1) throw err1

    // Also get agents with created_at within period (for those without trial_start_date)
    const { data: agentsByCreatedDate, error: err2 } = await postgrestAdmin
      .from('real_estate_agents')
      .select(`
        id,
        email,
        first_name,
        last_name,
        trial_start_date,
        created_at,
        onboarding_simulations!left(status, created_at)
      `)
      .eq('plan_tier', 'trial')
      .is('trial_start_date', null)
      .gte('created_at', periodStart.toISOString())

    if (err2) throw err2

    // Merge and deduplicate agents
    const agentMap = new Map()
    for (const agent of (agentsByTrialDate ?? []) as any[]) {
      agentMap.set(agent.id, agent)
    }
    for (const agent of (agentsByCreatedDate ?? []) as any[]) {
      if (!agentMap.has(agent.id)) {
        agentMap.set(agent.id, agent)
      }
    }
    const agents = Array.from(agentMap.values())

    let totalTrialAgents = 0
    let completedWithin3Days = 0
    const agentDetails: AgentWithSimulation[] = []

    for (const agent of (agents ?? []) as any[]) {
      totalTrialAgents++

      // Determine trial start date (fallback to created_at)
      const trialStart = new Date(agent.trial_start_date || agent.created_at)
      const threeDaysAfter = new Date(trialStart.getTime() + 3 * 24 * 60 * 60 * 1000)

      // Check if any simulation was completed within 3 days
      const simulations = Array.isArray(agent.onboarding_simulations)
        ? agent.onboarding_simulations
        : agent.onboarding_simulations
        ? [agent.onboarding_simulations]
        : []

      const completedSim = simulations.find(
        (sim: any) => sim.status === 'success' && new Date(sim.created_at) <= threeDaysAfter
      )

      const hasCompleted = !!completedSim
      if (hasCompleted) {
        completedWithin3Days++
      }

      agentDetails.push({
        id: agent.id,
        email: agent.email,
        first_name: agent.first_name,
        last_name: agent.last_name,
        trial_start_date: agent.trial_start_date,
        created_at: agent.created_at,
        simulation_status: completedSim?.status || null,
        simulation_completed_at: completedSim?.created_at || null,
      })
    }

    const ahaMomentRate = totalTrialAgents > 0 ? completedWithin3Days / totalTrialAgents : 0
    const targetRate = 0.8 // 80% target
    const targetMet = ahaMomentRate >= targetRate

    const metrics: AhaMomentMetrics = {
      total_trial_agents: totalTrialAgents,
      completed_within_3_days: completedWithin3Days,
      aha_moment_rate: Math.round(ahaMomentRate * 1000) / 1000, // 3 decimal places
      target_rate: targetRate,
      target_met: targetMet,
      period_days: periodDays,
      as_of: now.toISOString(),
    }

    return NextResponse.json({
      metrics,
      agents: agentDetails,
    })
  } catch (err: any) {
    logger.error('[aha-moment-metrics] error:', err?.message ?? err)
    return NextResponse.json(
      { error: 'Internal server error', detail: err?.message ?? 'unknown' },
      { status: 500 }
    )
  }
}
