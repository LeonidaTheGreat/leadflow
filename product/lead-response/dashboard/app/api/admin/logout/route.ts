import { NextResponse } from 'next/server'
import { clearAdminSessionCookie } from '@/lib/admin-auth'

export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json({ success: true })
  clearAdminSessionCookie(response)
  return response
}
