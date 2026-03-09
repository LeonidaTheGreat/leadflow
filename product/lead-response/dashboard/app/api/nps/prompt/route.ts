import { NextRequest, NextResponse } from 'next/server'
import { shouldShowNPSPrompt, dismissNPSPrompt } from '@/lib/nps-service'
import { supabaseServer } from '@/lib/supabase-server'

// GET - Check if NPS prompt should be shown
export async function GET(request: NextRequest) {
  try {
    // Get the current user from the Authorization header (Supabase JWT)
    const authHeader = request.headers.get('authorization')
    
    // If no auth header, we can't determine agent ID securely
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { shouldShow: false },
        { status: 200 }
      )
    }

    // For authenticated requests, extract the user ID from the token
    // In a real scenario, you'd verify the JWT
    // For now, return false as this requires proper auth verification
    return NextResponse.json(
      { shouldShow: false },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error checking NPS prompt:', error)
    return NextResponse.json(
      { shouldShow: false },
      { status: 200 }
    )
  }
}

// POST - Dismiss NPS prompt
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { trigger } = body

    if (!trigger || !['auto_14d', 'auto_90d'].includes(trigger)) {
      return NextResponse.json(
        { error: 'Valid trigger is required (auto_14d or auto_90d)' },
        { status: 400 }
      )
    }

    // For now, we'll skip the agent ID verification
    // In production, extract from the verified JWT
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error dismissing NPS prompt:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
