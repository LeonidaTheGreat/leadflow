import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { getAuthUserId } from '@/lib/auth'

const supabase = supabaseAdmin

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId(request)
    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get event data from request body
    const { eventType, properties = {} } = await request.json()

    if (!eventType) {
      return NextResponse.json(
        { error: 'Event type is required' },
        { status: 400 }
      )
    }

    // Insert event into database
    const { error } = await supabase.from('events').insert({
      agent_id: userId,
      event_type: eventType,
      event_data: properties,
      source: 'client',
      created_at: new Date().toISOString()
    })

    if (error) {
      console.error('Error logging event:', error)
      return NextResponse.json(
        { error: 'Failed to log event' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Analytics event error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
