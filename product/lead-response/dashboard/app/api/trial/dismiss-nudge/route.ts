import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { getAuthUserId } from '@/lib/services/AuthService'
import { logger } from '@/lib/logger'

/**
 * POST /api/trial/dismiss-nudge
 *
 * Marks the trial expiry nudge banner as dismissed for the authenticated user.
 * Sets trial_banner_dismissed = true on the agent record.
 *
 * Note: dismissal is only respected while daysRemaining > 0.
 * Once the trial expires, the nudge re-appears regardless.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { error } = await supabaseAdmin
      .from('real_estate_agents')
      .update({ trial_banner_dismissed: true, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) {
      logger.error('Dismiss nudge DB error:', error)
      return NextResponse.json({ error: 'Failed to dismiss nudge' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    logger.error('Dismiss nudge error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
