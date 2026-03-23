/**
 * Lead Capture API — /api/lead-capture
 * UC: feat-lead-magnet-email-capture
 *
 * POST body:
 *   { email, firstName?, source?, utmSource?, utmMedium?, utmCampaign? }
 *
 * Stores in pilot_signups with source='lead_magnet', status='nurture'
 * Triggers Email 1 (playbook delivery) immediately.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase, isSupabaseConfigured } from '@/lib/supabase-server'
import { sendPlaybookEmail } from '@/lib/lead-magnet-email'

// Email format validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    // Parse body
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Validate email
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Extract optional fields
    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : null
    const source = typeof body.source === 'string' ? body.source : 'landing-page'
    const utmSource = typeof body.utmSource === 'string' ? body.utmSource : null
    const utmMedium = typeof body.utmMedium === 'string' ? body.utmMedium : null
    const utmCampaign = typeof body.utmCampaign === 'string' ? body.utmCampaign : null

    // Check Supabase is configured
    if (!isSupabaseConfigured()) {
      console.error('[lead-capture] Supabase not configured')
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500, headers: corsHeaders }
      )
    }

    // `name` column is NOT NULL — derive from firstName or email prefix
    const name = firstName || email.split('@')[0]

    // Upsert into pilot_signups
    // On conflict (email), update utm/source but don't create duplicate
    const { error: dbError } = await supabase
      .from('pilot_signups')
      .upsert(
        {
          email,
          name,
          first_name: firstName,
          source: 'lead_magnet',
          status: 'nurture',
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
        },
        {
          onConflict: 'email',
        }
      )

    if (dbError) {
      console.error('[lead-capture] DB error:', dbError)
      // Don't leak DB error details to client
      return NextResponse.json(
        { success: false, error: 'Failed to save. Please try again.' },
        { status: 500, headers: corsHeaders }
      )
    }

    // Send Email 1 (playbook delivery) — fire and don't await to keep response fast
    sendPlaybookEmail(email, firstName || undefined).catch((err) =>
      console.error('[lead-capture] Email send error:', err)
    )

    return NextResponse.json(
      { success: true, message: 'Playbook sent!' },
      { status: 200, headers: corsHeaders }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[lead-capture] Unexpected error:', message)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred. Please try again.' },
      { status: 500, headers: corsHeaders }
    )
  }
}
