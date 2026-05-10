import { NextRequest, NextResponse } from 'next/server'
import { postgrestAdmin } from '@/lib/db'
import { isAdminUser } from '@/lib/services/AuthService'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    if (!await isAdminUser(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = postgrestAdmin
      .from('pilot_signups')
      .select('*')
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ success: true, signups: data || [], total: data?.length || 0 })
  } catch (error) {
    logger.error('Failed to fetch pilot signups:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch pilot signups' }, { status: 500 })
  }
}
