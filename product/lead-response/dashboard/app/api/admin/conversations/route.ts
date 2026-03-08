import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/admin/conversations
 * Returns last 10 real conversations from leads + messages tables.
 * Phone numbers are masked (last 4 digits only).
 * Lead names are first-name only.
 *
 * Query params:
 *   outcome: 'all' | 'booked' | 'in-progress' | 'opted-out'
 */

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '****'
  const digits = phone.replace(/\D/g, '')
  if (digits.length <= 4) return '****'
  return `(***) ***-${digits.slice(-4)}`
}

function mapOutcome(lead: any): 'booked' | 'in-progress' | 'opted-out' {
  if (lead.dnc || lead.consent_sms === false) return 'opted-out'
  if (lead.appointment_booked || lead.status === 'booked' || lead.status === 'appointment_booked') return 'booked'
  return 'in-progress'
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const outcomeFilter = searchParams.get('outcome') || 'all'

  try {
    // Fetch leads with their message counts
    let leadsQuery = supabaseAdmin
      .from('leads')
      .select(`
        id,
        first_name,
        last_name,
        phone,
        status,
        dnc,
        consent_sms,
        appointment_booked,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(50) // Fetch more than needed to allow filtering

    const { data: leads, error: leadsError } = await leadsQuery

    if (leadsError) {
      console.error('Error fetching leads:', leadsError)
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({ conversations: [] })
    }

    // Fetch message counts per lead
    const leadIds = leads.map((l: any) => l.id)
    const { data: messageCounts } = await supabaseAdmin
      .from('messages')
      .select('lead_id')
      .in('lead_id', leadIds)

    const countMap: Record<string, number> = {}
    if (messageCounts) {
      for (const m of messageCounts) {
        countMap[m.lead_id] = (countMap[m.lead_id] || 0) + 1
      }
    }

    // Build conversations list
    let conversations = leads
      .filter((lead: any) => countMap[lead.id] > 0) // Only leads with messages
      .map((lead: any) => {
        const outcome = mapOutcome(lead)
        return {
          id: lead.id,
          firstName: lead.first_name || 'Unknown',
          phone: maskPhone(lead.phone),
          date: lead.created_at,
          messageCount: countMap[lead.id] || 0,
          outcome,
        }
      })

    // Apply outcome filter
    if (outcomeFilter !== 'all') {
      conversations = conversations.filter((c: any) => c.outcome === outcomeFilter)
    }

    // Limit to 10
    conversations = conversations.slice(0, 10)

    return NextResponse.json({ conversations })
  } catch (err: any) {
    console.error('Conversations API error:', err)
    return NextResponse.json(
      { error: 'Internal server error', detail: err.message },
      { status: 500 }
    )
  }
}
