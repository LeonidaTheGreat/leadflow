/**
 * Email Verification Service
 * Handles sending verification emails and token management
 * Part of: feat-email-verification-before-login
 */

import { supabaseServer as supabase } from '@/lib/supabase-server'
import { randomUUID } from 'crypto'

// Lazy-load Resend to avoid build error when package isn't installed
let _resend: any = null
async function getResend() {
  if (_resend) return _resend
  if (!process.env.RESEND_API_KEY) return null
  try {
    const { Resend } = await import('resend')
    _resend = new Resend(process.env.RESEND_API_KEY)
    return _resend
  } catch {
    return null
  }
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@leadflow.ai'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-five.vercel.app'
const COMPANY_NAME = 'LeadFlow AI'
const SUPPORT_EMAIL = 'support@leadflow.ai'

interface VerificationEmailData {
  firstName: string
  verificationUrl: string
}

interface EmailEvent {
  customer_id: string
  email_type: string
  recipient: string
  subject: string
  status: 'sent' | 'failed' | 'queued'
  sent_at?: string
  error_message?: string
  metadata?: any
}

/**
 * Log email event to database
 */
async function logEmailEvent(event: EmailEvent): Promise<void> {
  try {
    await supabase.from('email_events').insert(event)
  } catch (error) {
    console.error('Error logging email event:', error)
  }
}

/**
 * Send email via Resend
 */
async function sendEmail(
  to: string,
  subject: string,
  html: string,
  customerId: string,
  emailType: string,
  metadata?: any
): Promise<boolean> {
  try {
    const resend = await getResend()
    // If Resend not configured, log and return success (for testing)
    if (!resend) {
      console.log(`📧 Email queued (Resend not configured): ${emailType} to ${to}`)
      console.log(`   Verification URL: ${metadata?.verificationUrl}`)
      await logEmailEvent({
        customer_id: customerId,
        email_type: emailType,
        recipient: to,
        subject: subject,
        status: 'queued',
        metadata: metadata
      })
      return true
    }

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: `LeadFlow AI <${FROM_EMAIL}>`,
      to: to,
      subject: subject,
      html: html
    })

    if (error) {
      console.error(`❌ Failed to send email (${emailType}) to ${to}:`, error)
      await logEmailEvent({
        customer_id: customerId,
        email_type: emailType,
        recipient: to,
        subject: subject,
        status: 'failed',
        error_message: error.message,
        metadata: metadata
      })
      return false
    }

    console.log(`✅ Email sent (${emailType}) to ${to}`)
    await logEmailEvent({
      customer_id: customerId,
      email_type: emailType,
      recipient: to,
      subject: subject,
      status: 'sent',
      sent_at: new Date().toISOString(),
      metadata: { ...metadata, resend_id: data?.id }
    })

    return true
  } catch (error: any) {
    console.error(`❌ Error sending email (${emailType}):`, error)
    await logEmailEvent({
      customer_id: customerId,
      email_type: emailType,
      recipient: to,
      subject: subject,
      status: 'failed',
      error_message: error.message,
      metadata: metadata
    })
    return false
  }
}

/**
 * Create a verification token for an agent
 */
export async function createVerificationToken(agentId: string): Promise<string | null> {
  try {
    const token = randomUUID()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours

    const { error } = await supabase
      .from('email_verification_tokens')
      .insert({
        agent_id: agentId,
        token,
        expires_at: expiresAt,
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error('Error creating verification token:', error)
      return null
    }

    return token
  } catch (error) {
    console.error('Error creating verification token:', error)
    return null
  }
}

/**
 * Check rate limit for resend attempts (max 3 per hour)
 */
export async function checkResendRateLimit(agentId: string): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const { count, error } = await supabase
      .from('email_verification_tokens')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', agentId)
      .gte('created_at', oneHourAgo)

    if (error) {
      console.error('Error checking rate limit:', error)
      return { allowed: false, remaining: 0 }
    }

    const attemptCount = count || 0
    const allowed = attemptCount < 3
    const remaining = Math.max(0, 3 - attemptCount)

    return { allowed, remaining }
  } catch (error) {
    console.error('Error checking rate limit:', error)
    return { allowed: false, remaining: 0 }
  }
}

/**
 * Send verification email to agent
 */
export async function sendVerificationEmail(
  agentEmail: string,
  agentId: string,
  firstName: string,
  token: string
): Promise<boolean> {
  const verificationUrl = `${APP_URL}/api/auth/verify-email?token=${token}`
  const subject = 'Confirm your LeadFlow email address'

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm your LeadFlow email address</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
  <div style="background: #ffffff; border-radius: 8px; padding: 48px 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <!-- Logo -->
    <div style="text-align: center; margin-bottom: 32px;">
      <span style="color: #10b981; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">▶ LeadFlow AI</span>
    </div>

    <p style="font-size: 18px; font-weight: 600; color: #1f2937; margin-bottom: 16px;">Hi ${firstName || 'there'},</p>
    
    <p style="font-size: 16px; color: #4b5563; margin-bottom: 24px;">
      You're almost ready to start using LeadFlow AI.
    </p>
    
    <p style="font-size: 16px; color: #4b5563; margin-bottom: 32px;">
      Click the button below to confirm your email address and activate your account.
    </p>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 32px 0;">
      <a href="${verificationUrl}" 
         style="display: inline-block; background: #10b981; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Confirm my email address
      </a>
    </div>

    <!-- Fallback Link -->
    <p style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">
      Or copy and paste this link:
    </p>
    <p style="font-size: 14px; color: #10b981; word-break: break-all; margin-bottom: 32px;">
      ${verificationUrl}
    </p>

    <!-- Divider -->
    <div style="border-top: 1px solid #e5e7eb; margin: 24px 0;"></div>

    <!-- Expiry Note -->
    <p style="font-size: 14px; color: #6b7280; margin-bottom: 16px;">
      This link expires in 24 hours.
    </p>

    <p style="font-size: 14px; color: #6b7280; margin-bottom: 0;">
      If you didn't create a LeadFlow account, you can safely ignore this email.
    </p>
  </div>

  <!-- Footer -->
  <div style="text-align: center; padding: 24px 0;">
    <p style="font-size: 14px; color: #6b7280; margin: 0 0 8px;">
      — The LeadFlow Team
    </p>
    <p style="font-size: 12px; color: #9ca3af; margin: 0;">
      Need help? Contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color: #6b7280;">${SUPPORT_EMAIL}</a>
    </p>
  </div>
</body>
</html>
  `

  return sendEmail(agentEmail, subject, html, agentId, 'email_verification', {
    firstName,
    verificationUrl,
    token
  })
}

/**
 * Verify email token and mark agent as verified
 */
export async function verifyEmailToken(token: string): Promise<{ 
  success: boolean; 
  error?: 'invalid' | 'expired' | 'already_used' | 'server_error';
  agentId?: string;
}> {
  try {
    // Look up token
    const { data: tokenData, error: tokenError } = await supabase
      .from('email_verification_tokens')
      .select('id, agent_id, expires_at, used_at')
      .eq('token', token)
      .single()

    if (tokenError || !tokenData) {
      return { success: false, error: 'invalid' }
    }

    // Check if already used
    if (tokenData.used_at) {
      return { success: false, error: 'already_used' }
    }

    // Check if expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return { success: false, error: 'expired', agentId: tokenData.agent_id }
    }

    // Mark token as used
    const { error: updateTokenError } = await supabase
      .from('email_verification_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', tokenData.id)

    if (updateTokenError) {
      console.error('Error marking token as used:', updateTokenError)
      return { success: false, error: 'server_error' }
    }

    // Mark agent as verified
    const { error: updateAgentError } = await supabase
      .from('real_estate_agents')
      .update({ email_verified: true, updated_at: new Date().toISOString() })
      .eq('id', tokenData.agent_id)

    if (updateAgentError) {
      console.error('Error marking agent as verified:', updateAgentError)
      return { success: false, error: 'server_error' }
    }

    return { success: true, agentId: tokenData.agent_id }
  } catch (error) {
    console.error('Error verifying email token:', error)
    return { success: false, error: 'server_error' }
  }
}

/**
 * Get agent by email
 */
export async function getAgentByEmail(email: string): Promise<{ id: string; email_verified: boolean; first_name: string } | null> {
  try {
    const { data, error } = await supabase
      .from('real_estate_agents')
      .select('id, email_verified, first_name')
      .eq('email', email.toLowerCase())
      .single()

    if (error || !data) {
      return null
    }

    return data
  } catch (error) {
    console.error('Error getting agent by email:', error)
    return null
  }
}
