import { NextRequest, NextResponse } from 'next/server'
import { setAdminSessionCookie, verifyAdminToken } from '@/lib/admin-auth'
import { logger } from '@/lib/logger'

interface LoginBody {
  token?: string
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: LoginBody = await request.json().catch(() => ({}))
    const token = (body.token || '').trim()

    if (!token) {
      return NextResponse.json({ success: false, error: 'Token required' }, { status: 400 })
    }

    if (!process.env.ADMIN_SECRET) {
      logger.error('ADMIN_SECRET not configured')
      return NextResponse.json({ success: false, error: 'Admin auth not configured' }, { status: 500 })
    }

    if (!verifyAdminToken(token)) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })
    }

    const response = NextResponse.json({ success: true })
    await setAdminSessionCookie(response)
    return response
  } catch (err) {
    logger.error('Admin login error:', err)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}
