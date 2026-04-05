import { NextRequest, NextResponse } from 'next/server'
import { sendActiveTrialSequence } from '@/lib/trial-emails'

/**
 * POST /api/cron/send-trial-emails
 * Sends active trial conversion email sequence to agents at key milestones:
 * - Day 0: Welcome (also sent immediately at signup)
 * - Day 1: AI Aha moment
 * - Day 3: Upgrade nudge
 * - Day 7: Warning (halfway through trial)
 * - Day 14: Expired notification
 * - Day 15: Final chance recovery
 * 
 * Should be called daily via Vercel Cron at 10:00 UTC
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

    console.log('📧 Running active trial email sequence...')

    const results = await sendActiveTrialSequence()

    return NextResponse.json({
      success: true,
      message: 'Active trial email sequence processed',
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
    description: 'Sends active trial conversion email sequence (Day 0, 1, 3, 7, 14, 15)'
  })
}
