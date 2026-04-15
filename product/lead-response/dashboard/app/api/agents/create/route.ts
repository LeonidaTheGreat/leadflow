import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { logger } from '@/lib/logger'

const supabase = supabaseAdmin

/**
 * Wrapper to add timeout to async operations.
 * Rejects with TimeoutError if operation doesn't complete in time.
 */
async function withTimeout<T>(promise: Promise<T> | PromiseLike<T>, timeoutMs: number): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
  )
  return Promise.race([Promise.resolve(promise), timeoutPromise])
}

export async function POST(request: NextRequest) {
  try {
    const { email, name, phone, password, utm_source, utm_medium, utm_campaign, utm_content, utm_term } = await request.json()

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

    // Check if agent already exists (with 5s timeout)
    let existingAgent
    try {
      const result = await withTimeout(
        supabase
          .from('real_estate_agents')
          .select('id')
          .eq('email', email.toLowerCase())
          .single(),
        5000
      )
      existingAgent = result.data
    } catch (err: any) {
      // On timeout or error, continue (fail open for deduplication)
      if (err.message.includes('timed out')) {
        logger.warn('Duplicate check timeout for email:', email)
      } else {
        logger.error('Duplicate check error:', err)
      }
      existingAgent = null
    }

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

    // Sanitize UTM params — strip to alphanumeric + common safe chars only
    const sanitizeUtm = (val: string | undefined | null): string | null => {
      if (!val) return null
      return String(val).replace(/[^a-zA-Z0-9_\-. /]/g, '').slice(0, 255)
    }

    // Create agent record (with UTM attribution data and 5s timeout)
    let agent
    try {
      const result = await withTimeout(
        supabase
          .from('real_estate_agents')
          .insert({
            email: email.toLowerCase(),
            first_name: firstName,
            last_name: lastName,
            phone_number: phone,
            password_hash: passwordHash,
            email_verified: false, // Will be verified after Stripe checkout
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            // FR-4: Store UTM attribution (null if not present — first-touch, no overwrite)
            utm_source: sanitizeUtm(utm_source),
            utm_medium: sanitizeUtm(utm_medium),
            utm_campaign: sanitizeUtm(utm_campaign),
            utm_content: sanitizeUtm(utm_content),
            utm_term: sanitizeUtm(utm_term),
          })
          .select('id')
          .single(),
        5000
      )
      agent = result.data
    } catch (err: any) {
      logger.error('Error creating agent:', err)
      if (err.message.includes('timed out')) {
        return NextResponse.json(
          { error: 'Service temporarily unavailable. Please try again.' },
          { status: 503 }
        )
      }
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
    logger.error('Signup error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
