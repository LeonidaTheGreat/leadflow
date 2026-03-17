/**
 * GET /api/analytics/pilot-usage
 *
 * Dashboard-facing analytics endpoint for pilot agent engagement.
 * Proxies to the root /api/internal/pilot-usage with service role auth.
 *
 * Auth: Authenticated session required (admin users preferred).
 *
 * Returns: { pilots: PilotEngagementMetrics[], generatedAt: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Validate session — ensure user is logged in
  const sessionToken = request.cookies.get('leadflow_session')?.value
  if (!sessionToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const session = await validateSession(sessionToken)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get the service role key from environment
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    console.error('[pilot-usage] SUPABASE_SERVICE_ROLE_KEY not configured')
    return NextResponse.json(
      { error: 'Service not configured' },
      { status: 503 }
    )
  }

  try {
    // Call the root /api/internal/pilot-usage endpoint with service role auth
    // The root endpoint is served by the Vercel webhook app
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'
    const response = await fetch(`${baseUrl}/api/internal/pilot-usage`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      console.error('[pilot-usage] Upstream fetch failed:', {
        status: response.status,
        error: body,
      })
      return NextResponse.json(
        { error: body?.error || 'Failed to fetch pilot usage data' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data, { status: 200 })
  } catch (err) {
    console.error('[pilot-usage] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
