import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'

/**
 * GET /api/leads/[id]/messages
 * 
 * Fetch all messages for a lead
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('lead_id', id)
      .order('created_at', { ascending: true })

    if (error) {
      logger.error('❌ Error fetching messages:', error)
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      messages: messages || [] })

  } catch (error: any) {
    logger.error('❌ Messages API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
