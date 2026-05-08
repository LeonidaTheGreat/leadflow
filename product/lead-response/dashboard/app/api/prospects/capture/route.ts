import { NextRequest, NextResponse } from 'next/server'
import { ProspectWaitlistService } from '@/lib/services/ProspectWaitlistService'
import { isSupabaseConfigured } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400, headers: corsHeaders }
      )
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address' },
        { status: 400, headers: corsHeaders }
      )
    }

    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() || null : null
    const utmSource = typeof body.utmSource === 'string' ? body.utmSource : null
    const utmMedium = typeof body.utmMedium === 'string' ? body.utmMedium : null
    const utmCampaign = typeof body.utmCampaign === 'string' ? body.utmCampaign : null
    const source = typeof body.source === 'string' ? body.source : 'landing-page'

    if (!isSupabaseConfigured()) {
      logger.error('[prospects/capture] PostgREST not configured')
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500, headers: corsHeaders }
      )
    }

    const service = new ProspectWaitlistService()
    const result = await service.captureProspect({ email, firstName, utmSource, utmMedium, utmCampaign, source })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to save. Please try again.' },
        { status: 500, headers: corsHeaders }
      )
    }

    return NextResponse.json(
      { success: true, message: "You're on the list!" },
      { status: 200, headers: corsHeaders }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    logger.error('[prospects/capture] Unexpected error:', message)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred. Please try again.' },
      { status: 500, headers: corsHeaders }
    )
  }
}
