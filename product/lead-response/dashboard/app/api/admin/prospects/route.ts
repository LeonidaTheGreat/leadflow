import { NextRequest, NextResponse } from 'next/server'
import { ProspectWaitlistService } from '@/lib/services/ProspectWaitlistService'
import { isSupabaseConfigured } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'
import crypto from 'crypto'

function checkAdminAuth(request: NextRequest): boolean {
  const adminToken = request.headers.get('x-admin-token')
  const expectedToken = process.env.ADMIN_SECRET
  if (!expectedToken || !adminToken) return false
  return crypto.timingSafeEqual(
    Buffer.from(adminToken),
    Buffer.from(expectedToken)
  )
}

export async function GET(request: NextRequest) {
  try {
    if (!checkAdminAuth(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!isSupabaseConfigured()) {
      logger.error('[admin/prospects] PostgREST not configured')
      return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 })
    }

    const service = new ProspectWaitlistService()
    const prospects = await service.getProspects()

    return NextResponse.json({ success: true, prospects }, { status: 200 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    logger.error('[admin/prospects] Unexpected error:', message)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred.' },
      { status: 500 }
    )
  }
}
