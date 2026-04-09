import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { AuthService } from '@/lib/services/AuthService'

const supabase = supabaseAdmin
const authService = new AuthService(supabase)

export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get('leadflow_session')?.value
  
  if (!sessionToken) {
    return NextResponse.json(
      { error: 'No session found' },
      { status: 401 }
    )
  }
  
  const session = await authService.validateSession(sessionToken)
  
  if (!session) {
    return NextResponse.json(
      { error: 'Invalid or expired session' },
      { status: 401 }
    )
  }
  
  // Get user details
  const { data: user, error } = await supabase
    .from('real_estate_agents')
    .select('id, email, first_name, last_name')
    .eq('id', session.userId)
    .single()
  
  if (error || !user) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    )
  }
  
  // Get all active sessions for the user
  const sessions = await authService.getUserSessions(session.userId)
  
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
    },
    currentSession: {
      id: session.id,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt,
    },
    activeSessions: sessions.length,
  })
}
