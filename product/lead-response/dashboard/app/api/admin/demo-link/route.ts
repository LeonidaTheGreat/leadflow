import { NextResponse } from 'next/server'
import { createClient } from '@/lib/db'
import { logger } from '@/lib/logger'
import crypto from 'crypto'

/**
 * POST /api/admin/demo-link
 *
 * Generates a time-limited (24h) demo share token for the simulator page.
 * The token allows unauthenticated access to /admin/simulator for 24 hours.
 *
 * Returns:
 *   { token: string, url: string, expiresAt: string }
 *
 * GET /api/admin/demo-link?token=<token>
 *
 * Validates a demo token. Returns { valid: boolean, expiresAt?: string }
 */

function cleanEnv(value?: string): string | undefined {
  if (!value) return undefined
  return value.replace(/\\n/g, '').trim()
}

function getDB() {
  const dbUrl = cleanEnv(process.env.NEXT_PUBLIC_API_URL)
  const dbKey = cleanEnv(process.env.API_SECRET_KEY)

  if (!dbUrl || !dbKey) {
    throw new Error('Missing API configuration for demo link route')
  }

  return createClient(dbUrl, dbKey)
}

function generateToken(): { rawToken: string; tokenHash: string } {
  const array = new Uint8Array(24)
  crypto.getRandomValues(array)
  const rawToken = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
  return { rawToken, tokenHash }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const label = body?.label || null

    const { rawToken, tokenHash } = generateToken()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    const supabase = getDB()
    const { data, error } = await supabase
      .from('demo_tokens')
      .insert({
        token: tokenHash,
        expires_at: expiresAt,
        label,
        created_by: 'stojan' })
      .select('token, expires_at')
      .single()

    if (error) {
      logger.error('Failed to create demo token:', error)
      return NextResponse.json({ error: 'Failed to create demo link' }, { status: 500 })
    }

    // Build the full demo URL with raw token (hash is stored in DB, raw token is for user)
    const host = request.headers.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const url = `${protocol}://${host}/admin/simulator?demo=${rawToken}`

    return NextResponse.json({
      token: rawToken,
      url,
      expiresAt: data.expires_at })
  } catch (err: any) {
    logger.error('Demo link creation error:', err)
    return NextResponse.json({ error: 'Failed to create demo link' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const rawToken = searchParams.get('token')

    if (!rawToken) {
      return NextResponse.json({ valid: false, error: 'No token provided' }, { status: 400 })
    }

    // Hash the incoming token to compare against stored hash
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')

    const supabase = getDB()
    const { data, error } = await supabase
      .from('demo_tokens')
      .select('token, expires_at, used_at')
      .eq('token', tokenHash)
      .single()

    if (error || !data) {
      return NextResponse.json({ valid: false })
    }

    const now = new Date()
    const expiresAt = new Date(data.expires_at)
    const isExpired = now > expiresAt

    return NextResponse.json({
      valid: !isExpired,
      expiresAt: data.expires_at,
      expired: isExpired })
  } catch (err: any) {
    return NextResponse.json({ valid: false, error: 'Internal server error' }, { status: 500 })
  }
}
