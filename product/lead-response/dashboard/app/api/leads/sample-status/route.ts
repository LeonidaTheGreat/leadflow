import { NextRequest, NextResponse } from 'next/server'
import { postgrestAdmin } from '@/lib/db'
import { getAuthUserId } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId(request)
    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { data: sampleLeads, error } = await postgrestAdmin
      .from('leads')
      .select('id', { count: 'exact' })
      .eq('agent_id', userId)
      .eq('is_sample', true)

    if (error) {
      console.error('Sample status query error:', error)
      return NextResponse.json({ hasSampleLeads: false, sampleLeadCount: 0, agentId: userId })
    }

    const count = sampleLeads?.length ?? 0
    return NextResponse.json({
      hasSampleLeads: count > 0,
      sampleLeadCount: count,
      agentId: userId
    })

  } catch (error) {
    console.error('Sample status error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
