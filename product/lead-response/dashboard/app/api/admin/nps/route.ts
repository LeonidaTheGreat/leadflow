import { NextRequest, NextResponse } from 'next/server'
import { getNPSStats, getUnprocessedChurnRisks, markChurnRiskProcessed } from '@/lib/nps-service'
import { supabaseServer } from '@/lib/supabase-server'

// Simple admin auth check - verify the request has a valid admin token
async function isAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return false
  }

  const token = authHeader.slice(7)
  // Check against service role key for admin access
  return token === process.env.API_SECRET_KEY
}

// GET - Fetch NPS stats and churn risks
export async function GET(request: NextRequest) {
  try {
    if (!await isAdmin(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'churn-risks') {
      const churnRisks = await getUnprocessedChurnRisks()
      return NextResponse.json({ churnRisks })
    }

    // Default: return NPS stats
    const stats = await getNPSStats()
    return NextResponse.json(stats)
  } catch (error: any) {
    console.error('Error fetching admin NPS data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Mark churn risk as processed
export async function POST(request: NextRequest) {
  try {
    if (!await isAdmin(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, feedbackId } = body

    if (action === 'mark-processed' && feedbackId) {
      await markChurnRiskProcessed(feedbackId)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Error processing admin NPS action:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
