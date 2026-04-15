import { NextRequest, NextResponse } from 'next/server'
import { checkTrialStatus } from '@/lib/trial'
import { getAuthUserId } from '@/lib/services/AuthService'
import { logger } from '@/lib/logger'

/**
 * GET /api/trial/status
 * Returns trial status for authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId(request)
    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check trial status
    const trialStatus = await checkTrialStatus(userId)

    return NextResponse.json(trialStatus)

  } catch (error) {
    logger.error('Trial status error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
