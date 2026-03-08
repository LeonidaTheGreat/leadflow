import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/admin/demo-validate?token=<token>
 * Validates a demo token (used by middleware and client-side).
 * Returns { valid: boolean, expiresAt?: string }
 */

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ valid: false, reason: 'No token provided' }, { status: 400 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('demo_tokens')
      .select('id, token, expires_at, used_count')
      .eq('token', token)
      .single()

    if (error || !data) {
      return NextResponse.json({ valid: false, reason: 'Token not found' }, { status: 404 })
    }

    const isExpired = new Date(data.expires_at) < new Date()
    if (isExpired) {
      return NextResponse.json({ valid: false, reason: 'Token expired' }, { status: 401 })
    }

    // Increment usage count
    await supabaseAdmin
      .from('demo_tokens')
      .update({
        used_count: (data.used_count || 0) + 1,
        used_at: new Date().toISOString(),
      })
      .eq('id', data.id)

    return NextResponse.json({
      valid: true,
      expiresAt: data.expires_at,
    })
  } catch (err: any) {
    return NextResponse.json(
      { valid: false, reason: 'Validation error' },
      { status: 500 }
    )
  }
}
