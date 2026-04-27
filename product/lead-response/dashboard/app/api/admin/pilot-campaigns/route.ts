import { NextRequest, NextResponse } from 'next/server'
import { postgrestAdmin } from '@/lib/db'
import { logger } from '@/lib/logger'
import { requirePrivilegedRouteAuth } from '@/lib/security/privileged-route-auth'

export async function GET(request: NextRequest) {
  const unauthorized = await requirePrivilegedRouteAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { data, error } = await postgrestAdmin
      .from('pilot_recruitment_campaigns')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, campaigns: data })
  } catch (err) {
    logger.error('Error listing campaigns:', err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
