/**
 * POST /api/referrals/generate
 * Generate a unique referral link for a paid agent
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { getAuthUserId } from '@/lib/services/AuthService'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify agent exists and is paid
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('real_estate_agents')
      .select('id, subscription_status, plan_tier, email')
      .eq('id', userId)
      .single()

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Only paid agents can have referral links
    if (agent.subscription_status !== 'active' || !agent.plan_tier) {
      return NextResponse.json(
        {
          error: 'Only paid agents can generate referral links',
          message: 'Please upgrade to a paid plan to access referral program'
        },
        { status: 403 }
      )
    }

    // Check if agent already has a referral link
    const { data: existingLink } = await supabaseAdmin
      .from('referral_links')
      .select('*')
      .eq('agent_id', userId)
      .single()

    if (existingLink) {
      return NextResponse.json({
        referral_code: existingLink.referral_code,
        referral_link: existingLink.referral_link,
        created_at: existingLink.created_at
      })
    }

    // Generate unique referral code
    const referralCode = `REF-${userId.substring(0, 8).toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-five.vercel.app'
    const referralLink = `${appUrl}/signup?ref=${referralCode}`

    // Store referral link
    const { data: newLink, error: insertError } = await supabaseAdmin
      .from('referral_links')
      .insert({
        agent_id: userId,
        referral_code: referralCode,
        referral_link: referralLink
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to create referral link:', insertError)
      return NextResponse.json({ error: 'Failed to generate referral link' }, { status: 500 })
    }

    // Update agent's referral_link_generated_at
    await supabaseAdmin
      .from('real_estate_agents')
      .update({ referral_link_generated_at: new Date().toISOString() })
      .eq('id', userId)

    return NextResponse.json(
      {
        referral_code: newLink.referral_code,
        referral_link: newLink.referral_link,
        created_at: newLink.created_at
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error generating referral link:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
