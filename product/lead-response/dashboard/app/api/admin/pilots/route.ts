import { NextRequest, NextResponse } from 'next/server'
import { postgrestAdmin } from '@/lib/db'
import { isAdminUser } from '@/lib/services/AuthService'
import { logger } from '@/lib/logger'

/**
 * GET /api/admin/pilots
 * Fetch all pilot progress records for the admin dashboard
 * Returns paginated list of pilots with their current stage and metrics
 */
export async function GET(request: NextRequest) {
  try {
    if (!await isAdminUser(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')
    const offset = (page - 1) * pageSize

    // Fetch pilot progress records
    const { data: pilotsData, error: pilotsError } = await postgrestAdmin
      .from('pilot_progress')
      .select('*')
      .order('stuck_since', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (pilotsError) throw pilotsError

    // Fetch total count
    const { data: countData, error: countError } = await postgrestAdmin
      .from('pilot_progress')
      .select('id', { count: 'exact' })

    if (countError) throw countError

    // Fetch agent details for each pilot
    const agentIds = pilotsData?.map((p: any) => p.agent_id) || []
    const { data: agentsData, error: agentsError } = await postgrestAdmin
      .from('real_estate_agents')
      .select('id, email, first_name, last_name')
      .in('id', agentIds)

    if (agentsError) throw agentsError

    // Create agent lookup map
    const agentMap = new Map(agentsData?.map((a: any) => [a.id, a]) || [])

    // Combine pilot data with agent details and compute derived fields
    const pilots = (pilotsData || []).map((pilot: any) => {
      const agent: any = agentMap.get(pilot.agent_id) || {}
      const stageEnteredAt = new Date(pilot.stage_entered_at)
      const now = new Date()
      const hoursInStage = (now.getTime() - stageEnteredAt.getTime()) / (1000 * 60 * 60)
      const isStuck = hoursInStage > 24 && pilot.stage !== 'paid'

      return {
        ...pilot,
        email: agent.email || '',
        first_name: agent.first_name || '',
        last_name: agent.last_name || '',
        hours_in_stage: hoursInStage,
        is_stuck: isStuck }
    })

    // Sort by stuck first, then by hours in stage descending
    pilots.sort((a: any, b: any) => {
      if (a.is_stuck && !b.is_stuck) return -1
      if (!a.is_stuck && b.is_stuck) return 1
      return b.hours_in_stage - a.hours_in_stage
    })

    const total = countData?.length || 0

    return NextResponse.json({ success: true, pilots, total })
  } catch (error) {
    logger.error('Failed to fetch pilots:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pilots' },
      { status: 500 }
    )
  }
}
