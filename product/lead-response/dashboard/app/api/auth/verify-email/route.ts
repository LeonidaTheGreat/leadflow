import { NextRequest, NextResponse } from 'next/server'
import { verifyEmailToken, sendActivationEmail } from '@/lib/verification-email'
import { supabaseServer as supabase } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'

/**
 * GET /api/auth/verify-email?token=<token>
 *
 * Verifies an email address using the provided token.
 * On success: sends activation email with CTA to /onboarding,
 * then redirects the agent to /onboarding.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.redirect(new URL('/check-your-inbox?error=invalid_token', request.url))
    }

    const result = await verifyEmailToken(token)

    if (result.success && result.agentId) {
      // Fetch agent details for the activation email
      try {
        const { data: agent } = await supabase
          .from('real_estate_agents')
          .select('email, first_name, activation_email_sent')
          .eq('id', result.agentId)
          .single()

        if (agent && !agent.activation_email_sent) {
          // Fire-and-forget — don't block the redirect on email delivery
          sendActivationEmail(agent.email, result.agentId, agent.first_name).catch((err) => {
            logger.error('Failed to send activation email:', err)
          })
        }
      } catch (emailErr) {
        // Non-fatal — log but still redirect
        logger.error('Error fetching agent for activation email:', emailErr)
      }

      // Redirect to onboarding
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }

    // Handle different error cases
    switch (result.error) {
      case 'expired':
        return NextResponse.redirect(new URL('/check-your-inbox?error=link_expired', request.url))

      case 'already_used':
        // Agent already verified — send to login so they can continue
        return NextResponse.redirect(new URL('/login?message=already_verified', request.url))

      case 'invalid':
      default:
        return NextResponse.redirect(new URL('/check-your-inbox?error=invalid_token', request.url))
    }
  } catch (error) {
    logger.error('Verify email error:', error)
    return NextResponse.redirect(new URL('/check-your-inbox?error=invalid_token', request.url))
  }
}
