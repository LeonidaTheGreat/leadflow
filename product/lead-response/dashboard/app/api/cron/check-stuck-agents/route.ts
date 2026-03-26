import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'

const onboardingTelemetry = require('@/lib/onboarding-telemetry')

export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET
    const authHeader = request.headers.get('authorization')
    const querySecret = new URL(request.url).searchParams.get('secret')

    if (!cronSecret) {
      console.warn('[/api/cron/check-stuck-agents] CRON_SECRET not configured')
      return NextResponse.json(
        { error: 'CRON_SECRET not configured' },
        { status: 500 }
      )
    }

    const providedSecret = authHeader?.replace('Bearer ', '') || querySecret
    if (providedSecret !== cronSecret) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid cron secret' },
        { status: 401 }
      )
    }

const supabase = supabaseAdmin
