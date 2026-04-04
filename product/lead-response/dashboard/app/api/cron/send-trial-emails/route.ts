import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { sendTrialReminderEmails } from '@/lib/trial-emails'

const supabase = supabaseAdmin

/**
 * POST /api/cron/send-trial-emails
 * Sends trial countdown reminder emails to agents at key milestones:
 * - 6 days remaining (trial_day6)
 * - 3 days remaining (trial_day3)
 * - 1 day remaining (trial_day1)
 * - 0 days (trial_expired)
 * 
 * Should be called daily via Vercel Cron or heartbeat
 */
export async function POST(request: NextRequest) {
  try {
    // Verify this is a cron request (check for Cron secret if configured)
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
      const authHeader = request.headers.get('authorization')
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    console.log('📧 Running trial email sequence...')

    const results = await sendTrialReminderEmails()

    return NextResponse.json({
      success: true,
      message: 'Trial email sequence processed',
      results
    })

  } catch (error) {
    console.error('❌ Trial email cron job error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Trial email cron job failed',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

// Allow GET for health checks
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Trial email cron endpoint',
    method: 'POST',
    description: 'Sends trial reminder emails at key milestones (day 6, 3, 1, and expired)'
  })
}
