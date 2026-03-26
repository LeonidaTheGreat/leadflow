import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db'

// Statuses considered "stuck"
const STUCK_STATUSES = ['needs_merge', 'not_started', 'in_progress', 'stuck']

// Priority weights for sorting
const PRIORITY_WEIGHTS: Record<string, number> = {
  'critical': 4,
  'high': 3,
  'medium': 2,
  'low': 1,
  '1': 4,
  '2': 3,
  '3': 2,
  '4': 1,
}

interface UseCase {
  id: string
  name: string
  implementation_status: string
  priority: string
  phase?: string
  description?: string
  created_at: string
  updated_at: string
}

interface Analysis {
  id: string
  name: string
  status: string
  priority: string
  phase?: string
  created_at: string
  updated_at: string
  recommendation: string | null
  reasoning: string[]
}

async function fetchUseCases(supabase: any): Promise<UseCase[]> {
  const { data: useCases, error } = await supabase
    .from('use_cases')
    .select('*')
    .order('priority', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch use cases: ${error.message}`)
  }

  return useCases || []
}

function categorizeUseCases(useCases: UseCase[]) {
  const categories: Record<string, UseCase[]> = {
    stuck: [],
    needs_merge: [],
    not_started: [],
    in_progress: [],
    complete: [],
    other: [],
  }

  for (const uc of useCases) {
    const status = (uc.implementation_status || 'unknown').toLowerCase()

    if (categories[status]) {
      categories[status].push(uc)
    } else {
      categories.other.push(uc)
    }
  }

  return categories
}

function analyzeUseCase(uc: UseCase): Analysis {
  const analysis: Analysis = {
    id: uc.id,
    name: uc.name,
    status: uc.implementation_status,
    priority: uc.priority,
    phase: uc.phase,
    created_at: uc.created_at,
    updated_at: uc.updated_at,
    recommendation: null,
    reasoning: [],
  }

  // Check for age
  const updatedAt = new Date(uc.updated_at || uc.created_at)
  const daysSinceUpdate = Math.floor((Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24))

  if (daysSinceUpdate > 30) {
    analysis.reasoning.push(`Stale: No update in ${daysSinceUpdate} days`)
  }

  // Check for description quality
  const description = uc.description || ''
  if (description.length < 50) {
    analysis.reasoning.push('Poor spec: Description is too brief')
  }

  // Check for acceptance criteria
  const hasAC = description.toLowerCase().includes('acceptance criteria') ||
                description.toLowerCase().includes('ac-')

  if (!hasAC) {
    analysis.reasoning.push('No acceptance criteria defined')
  }

  // Determine recommendation
  if (analysis.status === 'needs_merge') {
    analysis.recommendation = 'MERGE'
    analysis.reasoning.push('Code likely exists in a branch - verify and merge')
  } else if (analysis.status === 'in_progress') {
    if (daysSinceUpdate > 14) {
      analysis.recommendation = 'REVIEW'
      analysis.reasoning.push('In progress but stalled - needs review')
    } else {
      analysis.recommendation = 'CONTINUE'
      analysis.reasoning.push('Recently active - continue development')
    }
  } else if (analysis.status === 'not_started') {
    if (analysis.priority === 'critical' || analysis.priority === '1') {
      analysis.recommendation = 'START'
      analysis.reasoning.push('High priority - should be started')
    } else if (daysSinceUpdate > 60) {
      analysis.recommendation = 'DEPRECATE'
      analysis.reasoning.push('Low priority and stale - consider deprecating')
    } else {
      analysis.recommendation = 'BACKLOG'
      analysis.reasoning.push('Valid but not urgent - keep in backlog')
    }
  } else if (analysis.status === 'stuck') {
    analysis.recommendation = 'ESCALATE'
    analysis.reasoning.push('Blocked - needs PM/owner decision')
  }

  return analysis
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin authorization
    const authHeader = request.headers.get('authorization')
    const internalKey = process.env.INTERNAL_API_KEY

    if (internalKey && authHeader !== `Bearer ${internalKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_API_URL || 'https://api.imagineapi.org',
      process.env.API_SECRET_KEY || process.env.NEXT_PUBLIC_API_KEY || ''
    )

    const useCases = await fetchUseCases(supabase)
    const categories = categorizeUseCases(useCases)
    const stuckUseCases = STUCK_STATUSES.flatMap(status => categories[status])
    const analyses = stuckUseCases.map(analyzeUseCase)

    // Generate summary
    const summary = {
      total: useCases.length,
      stuck: stuckUseCases.length,
      by_status: {
        needs_merge: categories.needs_merge.length,
        not_started: categories.not_started.length,
        in_progress: categories.in_progress.length,
        stuck: categories.stuck.length,
      },
      by_recommendation: analyses.reduce((acc: Record<string, number>, a: Analysis) => {
        acc[a.recommendation || 'UNKNOWN'] = (acc[a.recommendation || 'UNKNOWN'] || 0) + 1
        return acc
      }, {}),
    }

    // Sort analyses by priority and recommendation
    const priorityOrder = ['START', 'MERGE', 'ESCALATE', 'REVIEW', 'CONTINUE', 'BACKLOG', 'DEPRECATE']
    analyses.sort((a, b) => {
      const recDiff = priorityOrder.indexOf(a.recommendation || '') - priorityOrder.indexOf(b.recommendation || '')
      if (recDiff !== 0) return recDiff
      return (PRIORITY_WEIGHTS[b.priority] || 0) - (PRIORITY_WEIGHTS[a.priority] || 0)
    })

    return NextResponse.json({
      success: true,
      summary,
      analyses,
      generated_at: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('[/api/admin/triage-use-cases] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
