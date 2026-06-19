import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/admin-auth'

// Lightweight admin check for the Builder/Admin X-ray overlay. The admin_session
// cookie is httpOnly (unreadable from client JS), so the overlay asks the server
// whether the current request is an authenticated admin.
export async function GET(request: NextRequest) {
  const admin = await requireAdminSession(request)
  return NextResponse.json({ admin }, { headers: { 'Cache-Control': 'no-store' } })
}
