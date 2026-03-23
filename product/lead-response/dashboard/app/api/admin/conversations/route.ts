import { NextResponse } from 'next/server'
import { createClient } from '@/lib/db'

/**
 * GET /api/admin/conversations
 *
 * Returns last 10 real lead conversations from sms_messages, anonymized:
 * - lead name: first name only
 * - phone: last 4 digits only
 * - full message thread in chronological order
 * - outcome derived from lead status
 *
 * Query params:
 *   ?outcome=all|booked|in-progress|opted-out (default: all)
 */

const DB_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL)!
const DB_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY)!

function getDB() {
  return createClient(DB_URL, DB_KEY)
}

function maskPhone(phone: string | null): string {
  if (!phone) return '****'
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 4 ? `****${digits.slice(-4)}` : '****'
}

function deriveOutcome(status: string | null): 'booked' | 'in-progress' | 'opted-out' {
  if (!status) return 'in-progress'
  if (status === 'appointment') return 'booked'
  if (status === 'dnc') return 'opted-out'
  return 'in-progress'
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const outcomeFilter = searchParams.get('outcome') || 'all'

    const supabase = getDB()

    // Fetch leads with their message counts (last 20 to allow filtering)
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, name, phone, status, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(20)

    if (leadsError) {
      console.error('Failed to fetch leads:', leadsError)
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({ conversations: [] })
    }

    // Fetch messages for all these leads
    const leadIds = leads.map((l: any) => l.id)
    const { data: messages, error: msgError } = await supabase
      .from('sms_messages')
      .select('id, lead_id, direction, message_body, created_at, status')
      .in('lead_id', leadIds)
      .order('created_at', { ascending: true })

    if (msgError) {
      console.error('Failed to fetch messages:', msgError)
    }

    const messagesByLead: Record<string, any[]> = {}
    if (messages) {
      for (const msg of messages as any[]) {
        if (!msg.lead_id) continue
        if (!messagesByLead[msg.lead_id]) messagesByLead[msg.lead_id] = []
        messagesByLead[msg.lead_id]!.push(msg)
      }
    }

    // Build conversation objects
    let conversations: any[] = leads
      .filter((lead: any) => {
        const msgs = messagesByLead[lead.id] || []
        return msgs.length > 0 // Only include leads that have messages
      })
      .map((lead: any) => {
        const msgs = messagesByLead[lead.id] || []
        const firstName = lead.name ? lead.name.split(' ')[0] : 'Lead'
        const outcome = deriveOutcome(lead.status)

        return {
          id: lead.id,
          leadName: firstName,
          maskedPhone: maskPhone(lead.phone),
          date: lead.updated_at || lead.created_at,
          messageCount: msgs.length,
          outcome,
          status: lead.status,
          messages: msgs.map((m: any) => ({
            id: m.id,
            direction: m.direction === 'inbound' ? 'inbound' : 'outbound',
            body: m.message_body,
            timestamp: m.created_at,
          })),
        }
      })

    // Apply outcome filter
    if (outcomeFilter !== 'all') {
      conversations = conversations.filter((c) => c.outcome === outcomeFilter)
    }

    // Return top 10
    conversations = conversations.slice(0, 10)

    return NextResponse.json({ conversations })
  } catch (err: any) {
    console.error('Conversations fetch error:', err)
    return NextResponse.json({ error: 'Failed to load conversations', detail: err.message }, { status: 500 })
  }
}
