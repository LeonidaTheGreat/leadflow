/**
 * GET /api/admin/nps
 * Get NPS statistics for admin dashboard
 * feat-nps-agent-feedback
 */

import { NextRequest, NextResponse } from 'next/server'
import { getNPSStats, getUnprocessedChurnRisks, markChurnRiskProcessed } from '@/lib/nps-service'
import { supabaseServer as supabase } from '@/lib/supabase-server'

// Simple admin check - in production, use proper role-based auth
async function isAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return false
  }

  const sessionToken = authHeader.substring(7)
  const { data: { user }, error } = await supabase.auth.getUser(sessionToken)
  
  if (error || !user) {
    return false
  }

  // Check if user has admin role
  const { data: agent } = await supabase
    .from('agents')
    .select('role')
    .eq('email', user.email)
    .single()

  return agent?.role === 'admin'
}

export async function GET(request: NextRequest) {
  try {
    // Check admin access
    if (!(await isAdmin(request))) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const includeChurnRisks = searchParams.get('include_churn_risks') === 'true'

    // Get NPS stats
    const stats = await getNPSStats()

    // Get unprocessed churn risks if requested
    let churnRisks = null
    if (includeChurnRisks) {
      churnRisks = await getUnprocessedChurnRisks()
    }

    return NextResponse.json({
      success: true,
      data: {
        nps: stats,
        churnRisks,
      },
    })

  } catch (error: any) {
    console.error('Error fetching admin NPS data:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/nps/churn-risk/:id/process
 * Mark a churn risk as processed
 */
export async function PATCH(request: NextRequest) {
  try {
    // Check admin access
    if (!(await isAdmin(request))) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { feedbackId } = body

    if (!feedbackId) {
      return NextResponse.json(
        { success: false, error: 'feedbackId is required' },
        { status: 400 }
      )
    }

    await markChurnRiskProcessed(feedbackId)

    return NextResponse.json({
      success: true,
      message: 'Churn risk marked as processed',
    })

  } catch (error: any) {
    console.error('Error processing churn risk:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
