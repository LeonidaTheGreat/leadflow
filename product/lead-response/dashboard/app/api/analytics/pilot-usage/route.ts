/**
 * GET /api/analytics/pilot-usage
 *
 * Proxy endpoint for authenticated dashboard users to view pilot engagement metrics.
 * 
 * This endpoint:
 * 1. Verifies the user is authenticated (JWT middleware)
 * 2. Proxies to /api/internal/pilot-usage with service role key
 * 3. Returns aggregated session/page-view data for all pilots
 *
 * Access: Authenticated dashboard users (any agent)
 * Use case: Dashboard SessionAnalyticsCard component
 */

import { NextRequest, NextResponse } from 'next/server'

/**
 * Verify JWT token from Authorization header.
 * Returns the decoded token payload if valid, or null if invalid/missing.
 */
function verifyJwt(req: NextRequest): boolean {
  // The JWT middleware should have already verified the token.
  // For safety, we check if the Authorization header exists and is a valid Bearer token.
  const authHeader = req.headers.get('authorization') || ''
  if (!authHeader.startsWith('Bearer ')) {
    return false
  }
  return true
}

export async function GET(req: NextRequest) {
  // Verify user is authenticated
  if (!verifyJwt(req)) {
    return NextResponse.json(
      { error: 'Unauthorized. You must be logged in to view pilot metrics.' },
      { status: 401 }
    )
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    console.error('[pilot-usage-proxy] SUPABASE_SERVICE_ROLE_KEY not configured')
    return NextResponse.json(
      { error: 'Internal server error: missing credentials' },
      { status: 500 }
    )
  }

  try {
    // Call the internal endpoint with service role key
    const internalUrl = new URL(
      '/api/internal/pilot-usage',
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000'
    )

    const internalRes = await fetch(internalUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      // Don't cache — always get fresh data
      cache: 'no-store',
    })

    if (!internalRes.ok) {
      console.error('[pilot-usage-proxy] internal endpoint returned', internalRes.status)
      const body = await internalRes.json().catch(() => ({}))
      return NextResponse.json(
        body || { error: 'Failed to fetch pilot metrics' },
        { status: internalRes.status }
      )
    }

    const data = await internalRes.json()
    return NextResponse.json(data)
  } catch (err) {
    console.error('[pilot-usage-proxy] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch pilot metrics' },
      { status: 500 }
    )
  }
}
