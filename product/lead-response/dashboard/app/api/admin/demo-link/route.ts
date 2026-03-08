import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

/**
 * POST /api/admin/demo-link
 * Generates a 24-hour demo share token for the simulator.
 * Token is stored in demo_tokens table.
 */

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Generate a secure random token
    const token = crypto.randomBytes(24).toString('base64url')

    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    const { data, error } = await supabaseAdmin
      .from('demo_tokens')
      .insert({
        token,
        expires_at: expiresAt.toISOString(),
        created_by: 'stojan',
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create demo token:', error)
      return NextResponse.json({ error: 'Failed to generate demo link' }, { status: 500 })
    }

    // Build the demo URL — use the request origin
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || ''
    const demoUrl = `${origin}/admin/simulator?demo=${token}`

    return NextResponse.json({
      success: true,
      token,
      demoUrl,
      expiresAt: expiresAt.toISOString(),
      expiresInHours: 24,
    })
  } catch (err: any) {
    console.error('Demo link generation error:', err)
    return NextResponse.json(
      { error: 'Internal server error', detail: err.message },
      { status: 500 }
    )
  }
}
