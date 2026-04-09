import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/services/AuthService'

const authService = AuthService.createDefaultService()

export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get('leadflow_session')?.value
  
  // Delete session from database if it exists
  if (sessionToken) {
    await authService.destroySession(sessionToken)
  }
  
  const response = NextResponse.json({ success: true })
  
  // Clear the session cookie
  response.cookies.set({
    name: 'leadflow_session',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  })
  
  return response
}
