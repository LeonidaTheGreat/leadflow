/**
 * GET /api/dashboard/session-analytics
 *
 * Dashboard wrapper for session analytics — calls /api/internal/pilot-usage
 * with service role authentication.
 * 
 * Auth: Requires authenticated session (any logged-in user).
 * Internal use only (from dashboard client).
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    // Call the internal pilot-usage API with service role key
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      return NextResponse.json(
        { error: 'Service configuration error: missing authentication key' },
        { status: 500 }
      )
    }

    const internalApiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const response = await fetch(`${internalApiUrl}/api/internal/pilot-usage`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: body?.error || 'Failed to fetch session analytics' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (err) {
    console.error('[dashboard/session-analytics] error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
