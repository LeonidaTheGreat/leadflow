import { NextResponse } from 'next/server'
import { createClient } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * POST /api/admin/lead-visibility/events
 *
 * Emits a lead experience visibility event (FR-6).
 *
 * Valid event types:
 *   lead_visibility_opened
 *   lead_simulator_started
 *   lead_simulator_succeeded
 *   lead_simulator_failed
 *   lead_visibility_fallback_used
 *   sample_viewer_opened
 *   demo_link_generated
 *
 * Body:
 *   {
 *     event_type: string,
 *     actor_id?: string,      // e.g. 'stojan'
 *     scenario_id?: string,   // e.g. 'buyer-inquiry'
 *     elapsed_ms?: number,    // time from page open to first transcript
 *     result_state?: string,  // idle | running | success | failed | timed_out
 *     event_data?: object     // additional context
 *   }
 *
 * Returns: { id: string, created_at: string }
 */

const VALID_EVENT_TYPES = new Set([
  'lead_visibility_opened',
  'lead_simulator_started',
  'lead_simulator_succeeded',
  'lead_simulator_failed',
  'lead_visibility_fallback_used',
  'sample_viewer_opened',
  'demo_link_generated',
])

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const {
      event_type,
      actor_id = 'stojan',
      scenario_id,
      elapsed_ms,
      result_state,
      event_data = {},
    } = body

    if (!event_type || !VALID_EVENT_TYPES.has(event_type)) {
      return NextResponse.json(
        { error: `Invalid event_type. Must be one of: ${[...VALID_EVENT_TYPES].join(', ')}` },
        { status: 400 }
      )
    }

    const DB_URL = process.env.NEXT_PUBLIC_API_URL || ''
    const DB_KEY = process.env.API_SECRET_KEY || ''
    const supabase = createClient(DB_URL, DB_KEY)

    const { data, error } = await supabase
      .from('lead_visibility_events')
      .insert({
        event_type,
        actor_id,
        scenario_id: scenario_id || null,
        elapsed_ms: typeof elapsed_ms === 'number' ? elapsed_ms : null,
        result_state: result_state || null,
        event_data: event_data || {},
      })
      .select('id, created_at')
      .single()

    if (error) {
      logger.error('Failed to store lead visibility event:', error)
      // Non-fatal: instrumentation should not block UX
      return NextResponse.json(
        { warning: 'Event recorded locally but not persisted', event_type },
        { status: 202 }
      )
    }

    return NextResponse.json({ id: data.id, created_at: data.created_at, event_type })
  } catch (err: any) {
    logger.error('Lead visibility event error:', err)
    // Non-fatal
    return NextResponse.json({ warning: 'Event not persisted', error: err.message }, { status: 202 })
  }
}

/**
 * GET /api/admin/lead-visibility/events
 * Returns recent events for querying (FR-6 queryable requirement).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const eventType = searchParams.get('event_type')
    const limitParam = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)

    const DB_URL = process.env.NEXT_PUBLIC_API_URL || ''
    const DB_KEY = process.env.API_SECRET_KEY || ''
    const supabase = createClient(DB_URL, DB_KEY)

    let query = supabase
      .from('lead_visibility_events')
      .select('id, event_type, actor_id, scenario_id, elapsed_ms, result_state, event_data, created_at')
      .order('created_at', { ascending: false })
      .limit(limitParam)

    if (eventType) {
      query = query.eq('event_type', eventType)
    }

    const { data, error } = await query

    if (error) {
      logger.error('Failed to fetch lead visibility events:', error)
      return NextResponse.json({ error: 'Failed to load events' }, { status: 500 })
    }

    return NextResponse.json({ events: data || [], total: (data || []).length })
  } catch (err: any) {
    logger.error('Lead visibility events fetch error:', err)
    return NextResponse.json({ error: 'Failed to load events' }, { status: 500 })
  }
}
