import { NextRequest, NextResponse } from 'next/server'
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

    // is_sample column doesn't exist on leads table — return safe defaults
    return NextResponse.json({
      hasSampleLeads: false,
      sampleLeadCount: 0,
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
