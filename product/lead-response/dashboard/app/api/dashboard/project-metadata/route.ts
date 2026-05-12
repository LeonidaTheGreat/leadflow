import { NextResponse } from 'next/server'
import { isPostgrestConfigured, postgrestAdmin } from '@/lib/db'
import { logger } from '@/lib/logger'

const LEADFLOW_PROJECT_ID = 'leadflow'
const MS_PER_DAY = 24 * 60 * 60 * 1000
const DEFAULT_GOAL = '$20K MRR'

type ProjectMetadataRow = {
  project_name?: string
  goal?: string
  deadline_days?: number
  start_date?: string
  overall_status?: string
  status_color?: string
}

function getDefaultProjectMetadata() {
  return {
    projectName: 'LeadFlow Real Estate AI',
    goal: DEFAULT_GOAL,
    currentDay: 0,
    deadline: 'Day 0',
    overallStatus: 'UNKNOWN',
  }
}

function getCurrentDay(startDateValue?: string): number {
  if (!startDateValue) return 0
  const startDate = new Date(startDateValue)
  if (Number.isNaN(startDate.getTime())) return 0

  const elapsedDays = Math.floor((Date.now() - startDate.getTime()) / MS_PER_DAY) + 1
  return Math.max(1, elapsedDays)
}

function getDeadlineLabel(startDateValue?: string, deadlineDays?: number): string {
  if (!deadlineDays || !startDateValue) {
    return deadlineDays ? `Day ${deadlineDays}` : 'Day 0'
  }

  const startDate = new Date(startDateValue)
  if (Number.isNaN(startDate.getTime())) {
    return `Day ${deadlineDays}`
  }

  const deadlineDate = new Date(startDate.getTime() + deadlineDays * MS_PER_DAY)
  const formattedDate = deadlineDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Toronto',
  })

  return `Day ${deadlineDays} (${formattedDate})`
}

function normalizeGoal(goal?: string): string {
  if (!goal) return DEFAULT_GOAL
  if (goal.toLowerCase().includes('20k mrr')) return DEFAULT_GOAL
  return goal
}

export async function GET() {
  if (!isPostgrestConfigured()) {
    return NextResponse.json({ metadata: getDefaultProjectMetadata() })
  }

  try {
    const { data, error } = await postgrestAdmin
      .from('project_metadata')
      .select('project_name,goal,deadline_days,start_date,overall_status,status_color')
      .eq('project_id', LEADFLOW_PROJECT_ID)
      .single()

    if (error) {
      logger.error('[dashboard/project-metadata] query failed', error)
      return NextResponse.json({ error: 'Failed to load project metadata' }, { status: 500 })
    }

    const row = (data || {}) as ProjectMetadataRow
    const currentDay = getCurrentDay(row.start_date)

    return NextResponse.json({
      metadata: {
        projectName: row.project_name || 'LeadFlow Real Estate AI',
        goal: normalizeGoal(row.goal),
        currentDay,
        deadline: getDeadlineLabel(row.start_date, row.deadline_days),
        overallStatus: row.overall_status || 'UNKNOWN',
        statusColor: row.status_color || '',
      },
    })
  } catch (error) {
    logger.error('[dashboard/project-metadata] unexpected error', error)
    return NextResponse.json({ error: 'Failed to load project metadata' }, { status: 500 })
  }
}

export const __test__ = {
  getCurrentDay,
  getDeadlineLabel,
  normalizeGoal,
  getDefaultProjectMetadata,
}
