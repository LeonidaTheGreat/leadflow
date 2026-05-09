import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

/**
 * POST /api/admin/payment-links
 *
 * Proxies to the backend Express API to generate a shareable Stripe Checkout URL.
 * The Next.js dashboard calls this; the Express API does the Stripe work.
 *
 * Body: { agentId: string, tier: 'starter' | 'pro' | 'team', discountPercent?: number }
 *
 * Returns: { url: string, sessionId: string, expiresAt: string }
 *
 * Auth: x-admin-token header (compared against ADMIN_SECRET env var)
 */

function checkAdminAuth(request: NextRequest): boolean {
  const adminToken = request.headers.get('x-admin-token')
  const expectedToken = process.env.ADMIN_SECRET
  if (!expectedToken) return false
  return adminToken === expectedToken
}

function getBackendApiKey(): string {
  return (process.env.LEADFLOW_API_KEY || process.env.API_SECRET_KEY || '').trim()
}

function getBackendUrl(): string {
  // In production the backend runs at the Cloudflare tunnel or Vercel project
  return (process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || '').trim()
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    if (!checkAdminAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { agentId, tier, discountPercent } = body

    // Forward to the backend Express API
    const backendUrl = getBackendUrl()
    const apiKey = getBackendApiKey()

    if (!backendUrl) {
      logger.error('[payment-links] Backend URL not configured')
      return NextResponse.json({ error: 'Backend API not configured' }, { status: 503 })
    }

    const backendRes = await fetch(`${backendUrl}/api/admin/generate-payment-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ agentId, tier, discountPercent }),
    })

    const data = await backendRes.json()

    if (!backendRes.ok) {
      logger.error('[payment-links] Backend error', { status: backendRes.status, data })
      return NextResponse.json(data, { status: backendRes.status })
    }

    logger.info('[payment-links] Generated payment link', { agentId, tier, sessionId: data.sessionId })
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    logger.error('[payment-links] Error generating payment link', err)
    return NextResponse.json({ error: 'Failed to generate payment link' }, { status: 500 })
  }
}

/**
 * GET /api/admin/payment-links
 *
 * Returns list of pilot/trial agents for the upgrade-offers UI.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    if (!checkAdminAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const backendUrl = getBackendUrl()
    const apiKey = getBackendApiKey()

    if (!backendUrl) {
      logger.error('[payment-links] Backend URL not configured')
      return NextResponse.json({ error: 'Backend API not configured' }, { status: 503 })
    }

    const backendRes = await fetch(`${backendUrl}/api/admin/upgrade-candidates`, {
      headers: { 'x-api-key': apiKey },
    })

    const data = await backendRes.json()

    if (!backendRes.ok) {
      return NextResponse.json(data, { status: backendRes.status })
    }

    return NextResponse.json(data)
  } catch (err: any) {
    logger.error('[payment-links] Error fetching upgrade candidates', err)
    return NextResponse.json({ error: 'Failed to fetch candidates' }, { status: 500 })
  }
}
