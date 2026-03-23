import { NextRequest, NextResponse } from 'next/server'
import { 
  getAgentByEmail, 
  checkResendRateLimit, 
  createVerificationToken, 
  sendVerificationEmail 
} from '@/lib/verification-email'

/**
 * POST /api/auth/resend-verification
 * 
 * Resends the verification email to the provided email address.
 * Rate limited: max 3 attempts per hour per agent.
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    // Validate email
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    // Find agent by email
    const agent = await getAgentByEmail(email)

    if (!agent) {
      return NextResponse.json(
        { error: 'AGENT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Check if already verified
    if (agent.email_verified) {
      return NextResponse.json(
        { message: 'Already verified' },
        { status: 200 }
      )
    }

    // Check rate limit (max 3 per hour)
    const rateLimit = await checkResendRateLimit(agent.id)

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'RATE_LIMIT', 
          message: 'Maximum resend attempts reached. Try again in an hour.' 
        },
        { status: 429 }
      )
    }

    // Create new verification token
    const token = await createVerificationToken(agent.id)

    if (!token) {
      return NextResponse.json(
        { error: 'Failed to create verification token' },
        { status: 500 }
      )
    }

    // Send verification email
    const emailSent = await sendVerificationEmail(email, agent.id, agent.first_name, token)

    if (!emailSent) {
      return NextResponse.json(
        { error: 'Failed to send verification email' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Verification email sent.' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Resend verification error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
