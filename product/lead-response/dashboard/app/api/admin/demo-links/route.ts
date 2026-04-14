/**
 * POST /api/admin/demo-links
 *
 * Creates a shareable demo token for the public demo page at /demo/[token].
 * Token is an 8-char random slug stored in demo_tokens table.
 *
 * Body (optional):
 *   { agentName?: string, agentEmail?: string, notes?: string }
 *
 * Returns:
 *   { token: string, url: string, expiresAt: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db'

function cleanEnv(value?: string): string | undefined {
  if (!value) return undefined
  return value.replace(/\\n/g, '').trim()
}

function getDB() {
  const dbUrl = cleanEnv(process.env.NEXT_PUBLIC_API_URL)
  const dbKey = cleanEnv(process.env.API_SECRET_KEY)

  if (!dbUrl || !dbKey) {
    throw new Error('Missing API configuration for demo-links route')
  }

  return createClient(dbUrl, dbKey)
}

/** Generate an 8-char alphanumeric token */
function generateShortToken(): string {
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  // Base64url-encode 6 bytes → 8 chars
  const base64 = btoa(String.fromCharCode(...bytes))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const agentName = typeof body?.agentName === 'string' ? body.agentName.trim().slice(0, 100) : null
    const agentEmail = typeof body?.agentEmail === 'string' ? body.agentEmail.trim().slice(0, 200) : null
    const notes = typeof body?.notes === 'string' ? body.notes.trim().slice(0, 500) : null

    const token = generateShortToken()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days

    const agentContext: Record<string, string> = {}
    if (agentName) agentContext.name = agentName
    if (agentEmail) agentContext.email = agentEmail
    if (notes) agentContext.notes = notes

    const db = getDB()
    const { data, error } = await db
      .from('demo_tokens')
      .insert({
        token,
        expires_at: expiresAt,
        view_count: 0,
        agent_context: Object.keys(agentContext).length > 0 ? agentContext : {},
      })
      .select('token, expires_at')
      .single()

    if (error) {
      console.error('Failed to create demo token:', error)
      return NextResponse.json({ error: 'Failed to create demo link' }, { status: 500 })
    }

    const host = request.headers.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const url = `${protocol}://${host}/demo/${data.token}`

    return NextResponse.json({
      token: data.token,
      url,
      expiresAt: data.expires_at,
    })
  } catch (err: any) {
    console.error('Demo link creation error:', err)
    return NextResponse.json(
      { error: 'Failed to create demo link', detail: err.message },
      { status: 500 },
    )
  }
}

/**
 * PATCH /api/admin/demo-links
 *
 * Increments view_count for a demo token. Called by the demo page on load.
 * Body: { token: string }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const token = typeof body?.token === 'string' ? body.token.trim() : null

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    const db = getDB()

    // Fetch current view_count, then increment
    const { data: existing, error: fetchErr } = await db
      .from('demo_tokens')
      .select('id, view_count')
      .eq('token', token)
      .single()

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 })
    }

    const newCount = (existing.view_count || 0) + 1
    const { error: updateErr } = await db
      .from('demo_tokens')
      .update({ view_count: newCount })
      .eq('id', existing.id)

    if (updateErr) {
      console.error('Failed to increment view count:', updateErr)
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }

    return NextResponse.json({ viewCount: newCount })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
