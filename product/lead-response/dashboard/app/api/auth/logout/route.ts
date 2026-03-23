import { NextRequest, NextResponse } from 'next/server'
import { deleteSession } from '@/lib/session'

export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get('leadflow_session')?.value
  
  // Delete session from database if it exists
  if (sessionToken) {
    await deleteSession(sessionToken)
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
