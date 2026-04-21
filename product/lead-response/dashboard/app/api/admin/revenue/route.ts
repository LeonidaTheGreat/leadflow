import { NextRequest, NextResponse } from 'next/server'
import { isAdminUser } from '@/lib/services/AuthService'
import { logger } from '@/lib/logger'

/**
 * GET /api/admin/revenue?days=7
 * Fetch revenue metrics for the admin dashboard
 * Returns historical revenue data including MRR, subscribers, conversion rates
 */
export async function GET(request: NextRequest) {
  try {
    if (!await isAdminUser(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8788'
    const apiKey = process.env.API_SECRET_KEY || process.env.NEXT_PUBLIC_API_KEY || ''

    // Fetch revenue metrics from database
    const url = new URL(`${baseUrl}/rest/v1/revenue_metrics`)
    url.searchParams.set('project_id', 'eq.leadflow')
    url.searchParams.set('date', `gte.${new Date(Date.now() - days * 86400000).toISOString().split('T')[0]}`)
    url.searchParams.set('order', 'date.desc')
    url.searchParams.set('limit', `${days + 1}`)

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.text()
      logger.error('Failed to fetch revenue metrics:', { status: response.status, error })
      return NextResponse.json(
        { success: false, error: 'Failed to fetch revenue metrics' },
        { status: response.status }
      )
    }

    const metrics = await response.json()

    // Parse data field and add calculated fields
    const processedMetrics = (metrics || []).map((m: any) => ({
      ...m,
      data: typeof m.data === 'string' ? JSON.parse(m.data) : m.data || {},
    }))

    // Calculate funnel visualization data
    const latest = processedMetrics[0]
    let funnel = {
      signups: { label: 'Signups', count: 0, rate: 0 },
      fub_connected: { label: 'FUB Connected', count: 0, rate: 0 },
      aha_moment: { label: 'Aha Moment', count: 0, rate: 0 },
      paid: { label: 'Paid', count: 0, rate: 0 },
    }

    if (latest?.data?.funnel) {
      funnel = latest.data.funnel
    }

    return NextResponse.json({
      success: true,
      metrics: processedMetrics,
      funnel,
      latest: processedMetrics[0],
      today: processedMetrics[0],
      yesterday: processedMetrics[1],
    })
  } catch (error) {
    logger.error('Failed to fetch revenue metrics:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch revenue metrics' },
      { status: 500 }
    )
  }
}
