import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase, isSupabaseConfigured } from '@/lib/supabase-server'
import { getAuthUserId } from '@/lib/auth'

/**
 * GET /api/onboarding/fub/test-status
 *
 * Polls for a test lead received from FUB for the authenticated agent.
 * The wizard uses this to confirm the webhook is configured correctly.
 *
 * Checks leads table for a lead associated with this agent created in the
 * last 10 minutes with source 'fub_webhook' (or any FUB source).
 *
 * Returns: { received: boolean, leadName?: string }
 */
export async function GET(request: NextRequest) {
  const agentId = await getAuthUserId(request)
  if (!agentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isSupabaseConfigured()) {
    // In dev without DB: always return not-received
    return NextResponse.json({ received: false })
  }

  // Look for a real (non-sample) lead received in the last 10 minutes from this agent
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()

  try {
    const { data: leads } = await supabase
      .from('leads')
      .select('id, name, source, created_at')
      .eq('agent_id', agentId)
      .gte('created_at', tenMinutesAgo)
      .not('is_sample', 'is', null) // only look for rows where is_sample is false/null

    // Filter to real leads (not sample data)
    const realLeads = (leads ?? []).filter((l: any) => !l.is_sample)

    if (realLeads.length > 0) {
      const lead = realLeads[0]
      return NextResponse.json({
        received: true,
        leadName: lead.name || 'Unknown Lead',
      })
    }

    return NextResponse.json({ received: false })
  } catch (err) {
    console.error('test-status error:', err)
    return NextResponse.json({ received: false })
  }
}
