import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import jwt from 'jsonwebtoken'

const supabase = supabaseAdmin

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

interface JWTPayload {
  userId: string
  email: string
  name?: string
}

export async function GET(request: NextRequest) {
  try {
    // Get auth token from cookie
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Verify JWT token
    let payload: JWTPayload
    try {
      payload = jwt.verify(token, JWT_SECRET) as JWTPayload
    } catch {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Count sample leads for this agent
    const { data: sampleLeads, error, count } = await supabase
      .from('leads')
      .select('id', { count: 'exact' })
      .eq('agent_id', payload.userId)
      .eq('is_sample', true)

    if (error) {
      console.error('Error fetching sample leads:', error)
      return NextResponse.json(
        { error: 'Failed to fetch sample leads' },
        { status: 500 }
      )
    }

    // Log sample_data_rendered event if sample leads exist
    if (count && count > 0) {
      try {
        await supabase.from('events').insert({
          agent_id: payload.userId,
          event_type: 'sample_data_rendered',
          event_data: { sampleLeadCount: count },
          source: 'dashboard',
          created_at: new Date().toISOString()
        })
      } catch {
        // Non-blocking error logging
      }
    }

    return NextResponse.json({
      hasSampleLeads: count ? count > 0 : false,
      sampleLeadCount: count || 0,
      agentId: payload.userId
    })

  } catch (error) {
    console.error('Sample status error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
