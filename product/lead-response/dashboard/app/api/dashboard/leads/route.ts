import { NextRequest, NextResponse } from 'next/server'
import { postgrestAdmin, isPostgrestConfigured } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  if (!isPostgrestConfigured()) {
    return NextResponse.json({ leads: [] })
  }

  try {
    const status = request.nextUrl.searchParams.get('status')

    let query = postgrestAdmin
      .from('lead_summary')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      logger.error('[dashboard/leads] query failed:', error)
      return NextResponse.json({ error: 'Failed to load leads' }, { status: 500 })
    }

    return NextResponse.json({ leads: data || [] })
  } catch (error) {
    logger.error('[dashboard/leads] unexpected error:', error)
    return NextResponse.json({ error: 'Failed to load leads' }, { status: 500 })
  }
}
