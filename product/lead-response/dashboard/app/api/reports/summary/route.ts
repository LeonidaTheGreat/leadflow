import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/services/AuthService'
import { supabaseAdmin } from '@/lib/supabase'
import { ReportsService } from '@/lib/services/ReportsService'
import { logger } from '@/lib/logger'

const reportsService = new ReportsService(supabaseAdmin)
const MIN_DAYS = 7
const MAX_DAYS = 365
const DEFAULT_DAYS = 30

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('leadflow_session')?.value
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = await validateSession(sessionToken)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const rawDays = searchParams.get('days') || String(DEFAULT_DAYS)
    const days = parseInt(rawDays, 10)

    if (Number.isNaN(days) || days < MIN_DAYS || days > MAX_DAYS) {
      return NextResponse.json({ error: `Invalid days parameter. Must be between ${MIN_DAYS} and ${MAX_DAYS}.` }, { status: 400 })
    }

    const report = await reportsService.getSummaryReport(days)

    return NextResponse.json({ success: true, data: report, timestamp: new Date().toISOString() }, {
      headers: {
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    logger.error('Error in reports summary route:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch reports data' },
      { status: 500 }
    )
  }
}
