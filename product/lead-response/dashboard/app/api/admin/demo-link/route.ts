import { NextResponse } from 'next/server'
import { createClient } from '@/lib/db'

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

const DB_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL)!
const DB_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY)!

function getDB() {
  return createClient(DB_URL, DB_KEY)
}

function generateToken(): string {
  const array = new Uint8Array(24)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const label = body?.label || null

    const token = generateToken()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    const supabase = getDB()
    const { data, error } = await supabase
      .from('demo_tokens')
      .insert({
        token,
        expires_at: expiresAt,
        label,
        created_by: 'stojan',
      })
      .select('token, expires_at')
      .single()

    if (error) {
      console.error('Failed to create demo token:', error)
      return NextResponse.json({ error: 'Failed to create demo link' }, { status: 500 })
    }

    // Build the full demo URL
    const host = request.headers.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const url = `${protocol}://${host}/admin/simulator?demo=${data.token}`

    return NextResponse.json({
      token: data.token,
      url,
      expiresAt: data.expires_at,
    })
  } catch (err: any) {
    console.error('Demo link creation error:', err)
    return NextResponse.json({ error: 'Failed to create demo link', detail: err.message }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ valid: false, error: 'No token provided' }, { status: 400 })
    }

    const supabase = getDB()
    const { data, error } = await supabase
      .from('demo_tokens')
      .select('token, expires_at, used_at')
      .eq('token', token)
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
      expired: isExpired,
    })
  } catch (err: any) {
    return NextResponse.json({ valid: false, error: err.message }, { status: 500 })
  }
}
