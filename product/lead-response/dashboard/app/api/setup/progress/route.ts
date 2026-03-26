import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db'
import jwt from 'jsonwebtoken'

const supabase = createClient(
  process.env.NEXT_PUBLIC_API_URL || 'https://api.imagineapi.org',
  process.env.API_SECRET_KEY || process.env.NEXT_PUBLIC_API_KEY || ''
)

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

interface JWTPayload {
  userId: string
  email: string
  name?: string
}

export async function POST(request: NextRequest) {
  try {
    // Get auth token from cookie
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Verify JWT token
    let payload: JWTPayload
    try {
      payload = jwt.verify(token, JWT_SECRET) as JWTPayload
    } catch {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const { step } = await request.json()

    if (!step) {
      return NextResponse.json(
        { error: 'Step is required' },
        { status: 400 }
      )
    }

    // Update agent's onboarding step
    const { error } = await supabase
      .from('real_estate_agents')
      .update({ onboarding_step: step })
      .eq('id', payload.userId)

    if (error) {
      console.error('Error updating onboarding step:', error)
      return NextResponse.json(
        { error: 'Failed to save progress' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Setup progress error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
