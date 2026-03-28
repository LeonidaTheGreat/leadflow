import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer, isSupabaseConfigured } from '@/lib/supabase-server'
import { getAuthUserId } from '@/lib/auth'

/**
 * Three sample leads with AI-drafted SMS responses.
 * Clearly marked as DEMO — never written to the database.
 */
const SAMPLE_LEADS = [
  {
    id: 'sample-lead-001',
    name: 'Sarah Johnson',
    email: 'sarah.j@example.com',
    phone: '+14165550101',
    source: 'Zillow',
    status: 'new',
    location: 'Toronto, ON',
    budget_min: 750000,
    budget_max: 950000,
    timeline: '1-3months',
    property_type: 'house',
    urgency_score: 82,
    message_count: 1,
    last_message: 'Hi, I saw your listing on Zillow and I\'m very interested in viewing it.',
    last_message_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 min ago
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    latest_qualification: {
      intent: 'buy',
      is_qualified: true,
      confidence_score: 0.87,
    },
    ai_drafted_response:
      "Hi Sarah! Thanks for reaching out about the listing on Zillow. I'd love to set up a showing for you. Are you available this weekend — Saturday or Sunday afternoon? I can also send over the full property details and recent comparable sales in the area. What works best for you?",
    is_sample: true,
    fub_id: null,
    agent_id: null,
    market: 'ca-ontario',
    consent_sms: true,
    consent_email: true,
    dnc: false,
    source_metadata: {},
    responded_at: null,
    last_contact_at: null,
  },
  {
    id: 'sample-lead-002',
    name: 'Michael Chen',
    email: 'mchen@example.com',
    phone: '+14165550202',
    source: 'Realtor.ca',
    status: 'qualified',
    location: 'Mississauga, ON',
    budget_min: 600000,
    budget_max: 750000,
    timeline: 'immediate',
    property_type: 'condo',
    urgency_score: 94,
    message_count: 3,
    last_message: 'We need to move by end of month. Pre-approved for $725k.',
    last_message_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2h ago
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    latest_qualification: {
      intent: 'buy',
      is_qualified: true,
      confidence_score: 0.94,
    },
    ai_drafted_response:
      "Hi Michael! That's great — being pre-approved speeds things up considerably. I have two condos in Mississauga that fit your budget and are available for immediate possession. Can I send you the details? If you like what you see, we could schedule viewings as early as tomorrow.",
    is_sample: true,
    fub_id: null,
    agent_id: null,
    market: 'ca-ontario',
    consent_sms: true,
    consent_email: true,
    dnc: false,
    source_metadata: {},
    responded_at: null,
    last_contact_at: null,
  },
  {
    id: 'sample-lead-003',
    name: 'Emily Rodriguez',
    email: 'emily.r@example.com',
    phone: '+14165550303',
    source: 'Facebook Ads',
    status: 'responded',
    location: 'Brampton, ON',
    budget_min: 500000,
    budget_max: 650000,
    timeline: '3-6months',
    property_type: 'house',
    urgency_score: 61,
    message_count: 5,
    last_message: 'Thanks for the info! We\'re still comparing a few neighbourhoods.',
    last_message_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    latest_qualification: {
      intent: 'buy',
      is_qualified: false,
      confidence_score: 0.61,
    },
    ai_drafted_response:
      "Hi Emily! Totally understand — finding the right neighbourhood is just as important as the home itself. I put together a quick comparison of Brampton vs. Mississauga for your budget range. Would a 15-minute call this week help? I can walk you through the pros and cons with recent data.",
    is_sample: true,
    fub_id: null,
    agent_id: null,
    market: 'ca-ontario',
    consent_sms: true,
    consent_email: true,
    dnc: false,
    source_metadata: {},
    responded_at: null,
    last_contact_at: null,
  },
]

/**
 * GET /api/sample-leads
 *
 * Returns 3 sample (DEMO) leads with AI-drafted responses for first-session trial users.
 * Eligibility: onboarding_completed = false.
 *
 * Sample data is generated in-memory — it is NEVER written to the database and
 * will NEVER appear in the lead_summary view for any agent.
 *
 * Returns:
 *   200 { eligible: true,  leads: [...] }  — first-session trial user
 *   200 { eligible: false, leads: []    }  — onboarding already completed
 *   401 — not authenticated
 *   503 — Supabase not configured (dev/build)
 */
export async function GET(request: NextRequest) {
  // In build/dev mode without Supabase, return not-eligible
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ eligible: false, leads: [] })
  }

  const agentId = await getAuthUserId(request)
  if (!agentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Check onboarding_completed for this agent
    const { data: agent, error } = await supabaseServer
      .from('real_estate_agents')
      .select('id, onboarding_completed, plan_tier')
      .eq('id', agentId)
      .single()

    if (error || !agent) {
      console.error('[sample-leads] agent lookup error:', error?.message)
      return NextResponse.json({ eligible: false, leads: [] })
    }

    // Only show sample leads when onboarding_completed is false/null
    const eligible = !agent.onboarding_completed

    return NextResponse.json({
      eligible,
      leads: eligible ? SAMPLE_LEADS : [],
    })
  } catch (err) {
    console.error('[sample-leads] unexpected error:', err)
    return NextResponse.json({ eligible: false, leads: [] })
  }
}
