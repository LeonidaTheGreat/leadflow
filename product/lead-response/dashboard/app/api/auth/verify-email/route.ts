import { NextRequest, NextResponse } from 'next/server'
import { verifyEmailToken } from '@/lib/verification-email'

/**
 * GET /api/auth/verify-email?token=<token>
 * 
 * Verifies an email address using the provided token.
 * Redirects to appropriate page based on verification result.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.redirect(new URL('/check-your-inbox?error=invalid_token', request.url))
    }

    const result = await verifyEmailToken(token)

    if (result.success) {
      // Verification successful - redirect to onboarding
      return NextResponse.redirect(new URL('/setup', request.url))
    }

    // Handle different error cases
    switch (result.error) {
      case 'expired':
        return NextResponse.redirect(new URL('/check-your-inbox?error=link_expired', request.url))
      
      case 'already_used':
        return NextResponse.redirect(new URL('/login?error=token_already_used', request.url))
      
      case 'invalid':
      default:
        return NextResponse.redirect(new URL('/check-your-inbox?error=invalid_token', request.url))
    }
  } catch (error) {
    console.error('Verify email error:', error)
    return NextResponse.redirect(new URL('/check-your-inbox?error=invalid_token', request.url))
  }
}
