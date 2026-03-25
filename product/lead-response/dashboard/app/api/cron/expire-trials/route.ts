import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db'
import { getExpiredTrialAgents } from '@/lib/trial'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/cron/expire-trials
 * Marks expired trial accounts and triggers cleanup
 * Should be called by Vercel Cron or heartbeat
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

    console.log('📅 Running expired trial cleanup...')

    // Get all expired trial agents
    const expiredAgentIds = await getExpiredTrialAgents()
    
    if (expiredAgentIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No expired trials found',
        processed: 0
      })
    }

    console.log(`Found ${expiredAgentIds.length} expired trial agents`)

    // Log events for each expired trial
    const events = expiredAgentIds.map(agentId => ({
      event_type: 'trial_expired',
      agent_id: agentId,
      event_data: {
        action: 'trial_auto_expired',
        timestamp: new Date().toISOString(),
      },
      source: 'cron_job',
      created_at: new Date().toISOString()
    }))

    // Batch insert events
    const { error: eventError } = await supabase
      .from('events')
      .insert(events)

    if (eventError) {
      console.error('Error logging trial expiry events:', eventError)
    } else {
      console.log(`✅ Logged ${expiredAgentIds.length} trial expiry events`)
    }

    // Optionally send notifications to Telegram or email
    // This could be expanded to notify agents about their expired trials
    
    return NextResponse.json({
      success: true,
      message: `Processed ${expiredAgentIds.length} expired trials`,
      processed: expiredAgentIds.length,
      agentIds: expiredAgentIds
    })

  } catch (error) {
    console.error('❌ Cron job error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Cron job failed',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

// Allow GET for health checks
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Expire trials cron endpoint',
    method: 'POST',
    description: 'Marks expired trial accounts. Should be called periodically via Vercel Cron or heartbeat.'
  })
}
