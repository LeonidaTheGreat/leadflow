import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/admin/conversations/[id]
 * Returns full message thread for a lead (anonymized).
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const { data: messages, error } = await supabaseAdmin
      .from('messages')
      .select('id, direction, content, body, created_at, status')
      .eq('lead_id', id)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    // Normalize message format
    const thread = (messages || []).map((m: any) => ({
      id: m.id,
      role: m.direction === 'outbound' ? 'ai' : 'lead',
      message: m.content || m.body || '',
      timestamp: m.created_at,
      status: m.status,
    }))

    return NextResponse.json({ thread })
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Internal server error', detail: err.message },
      { status: 500 }
    )
  }
}
