/**
 * GET /api/referrals/stats
 * Get agent's referral statistics (conversions, earned credits)
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { getAuthUserId } from '@/lib/services/AuthService'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all referrals for this agent
    const { data: referrals, error: referralsError } = await supabaseAdmin
      .from('referrals')
      .select('*')
      .eq('referrer_agent_id', userId)
      .order('created_at', { ascending: false })

    if (referralsError) {
      logger.error('Error fetching referrals:', referralsError)
      return NextResponse.json({ error: 'Failed to fetch referrals' }, { status: 500 })
    }

    // Calculate stats
    const conversions = (referrals || []).filter(r => r.conversion_status === 'converted')
    const pending = (referrals || []).filter(r => r.conversion_status === 'pending')
    const totalEarned = conversions.reduce((sum, ref) => sum + (ref.free_months_earned || 0), 0)

    // Get agent's data
    const { data: agent } = await supabaseAdmin
      .from('real_estate_agents')
      .select('total_referral_credits, subscription_status, plan_tier')
      .eq('id', userId)
      .single()

    return NextResponse.json({
      total_referred: referrals?.length || 0,
      converted_count: conversions.length,
      pending_count: pending.length,
      earned_free_months: totalEarned,
      total_credits: agent?.total_referral_credits || 0,
      estimated_value: conversions.length * 149, // $149/mo average
      conversion_rate: referrals?.length > 0 ? (conversions.length / referrals.length * 100).toFixed(1) : 0,
      referrals: referrals || []
    })
  } catch (error) {
    logger.error('Error fetching referral stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
