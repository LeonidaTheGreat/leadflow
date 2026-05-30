import { NextResponse } from 'next/server'
import { createClient } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * GET /api/admin/lead-visibility
 *
 * Returns demo-safe sample conversations from lead_simulations table.
 * Minimum 10 records, newest first.
 *
 * Each record:
 *   { id, scenario, outcome, messageCount, dateTime, conversation[] }
 *
 * Query params:
 *   ?outcome=all|booked|in_progress|opted_out (default: all)
 *   ?limit=10 (default 10, max 50)
 */

const SCENARIO_LABELS: Record<string, string> = {
  'buyer-inquiry': 'Buyer inquiry',
  'listing-valuation': 'Listing valuation',
  'rental-inquiry': 'Rental request',
  'seller-inquiry': 'Seller downsizing',
  'investment-inquiry': 'Investment property',
  'buyer-inquiry-weekend': 'Buyer inquiry - weekend showing',
}

const OUTCOME_LABELS: Record<string, string> = {
  booked: 'booked',
  in_progress: 'in_progress',
  opted_out: 'opted_out',
  unqualified: 'unqualified',
  completed: 'in_progress',
}

function normalizeOutcome(raw: string | null): string {
  if (!raw) return 'in_progress'
  return OUTCOME_LABELS[raw] || 'in_progress'
}

function scenarioLabel(scenario: string | null, leadName: string): string {
  if (!scenario) return leadName || 'Sample conversation'
  return SCENARIO_LABELS[scenario] || scenario.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const outcomeFilter = searchParams.get('outcome') || 'all'
    const limitParam = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50)

    const DB_URL = process.env.NEXT_PUBLIC_API_URL || ''
    const DB_KEY = process.env.API_SECRET_KEY || ''
    const supabase = createClient(DB_URL, DB_KEY)

    const { data, error } = await supabase
      .from('lead_simulations')
      .select('id, lead_name, scenario, outcome, conversation, created_at, property_interest')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      logger.error('Failed to fetch lead visibility samples:', error)
      return NextResponse.json({ error: 'Failed to load samples' }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ samples: [] })
    }

    // Map to clean sample records
    let samples = data
      .filter((row: any) => {
        // Only include rows that have conversation data
        const conv = row.conversation
        if (!conv || !Array.isArray(conv) || conv.length === 0) return false
        return true
      })
      .map((row: any) => {
        const conversation = Array.isArray(row.conversation) ? row.conversation : []
        const outcome = normalizeOutcome(row.outcome)
        return {
          id: row.id,
          scenario: scenarioLabel(row.scenario, row.lead_name),
          scenarioKey: row.scenario || 'buyer-inquiry',
          outcome,
          messageCount: conversation.length,
          dateTime: row.created_at,
          conversation,
        }
      })

    // Apply outcome filter
    if (outcomeFilter !== 'all') {
      samples = samples.filter((s: any) => s.outcome === outcomeFilter)
    }

    // Cap at limit
    samples = samples.slice(0, limitParam)

    return NextResponse.json({ samples, total: samples.length })
  } catch (err: any) {
    logger.error('Lead visibility samples error:', err)
    return NextResponse.json({ error: 'Failed to load samples' }, { status: 500 })
  }
}
