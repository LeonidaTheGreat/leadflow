import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db'
import bcrypt from 'bcryptjs'

// Use NEXT_PUBLIC_API_URL if set (already includes /rest/v1), otherwise construct from SUPABASE_URL
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 
  (process.env.NEXT_PUBLIC_SUPABASE_URL ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1` : undefined)

const supabase = createClient(
  apiUrl!,
  (process.env.API_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!
)

export async function POST(request: NextRequest) {
  try {
    const { email, name, phone, password } = await request.json()

    // Validate required fields
    if (!email || !name || !phone || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Check if agent already exists
    const { data: existingAgent } = await supabase
      .from('real_estate_agents')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existingAgent) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Split name into first and last
    const nameParts = name.trim().split(' ')
    const firstName = nameParts[0]
    const lastName = nameParts.slice(1).join(' ') || ''

    // Create agent record
    const { data: agent, error: createError } = await supabase
      .from('real_estate_agents')
      .insert({
        email: email.toLowerCase(),
        first_name: firstName,
        last_name: lastName,
        phone_number: phone,
        password_hash: passwordHash,
        email_verified: false, // Will be verified after Stripe checkout
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (createError) {
      console.error('Error creating agent:', createError)
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      agentId: agent.id,
      message: 'Account created successfully'
    })

  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
