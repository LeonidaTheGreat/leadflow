/**
 * Email Service for Subscription Lifecycle Events
 * UC-11: Subscription Lifecycle Management
 */

import { supabaseServer as supabase } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'

// Lazy-load Resend to avoid build error when package isn't installed
let _resend: any = null
async function getResend() {
  if (_resend) return _resend
  if (!process.env.RESEND_API_KEY) return null
  try {
    const { Resend } = await import('resend')
    _resend = new Resend(process.env.RESEND_API_KEY!.trim())
    return _resend
  } catch {
    return null
  }
}

// Use Resend's shared domain as fallback — landyourleads.com domain must be verified
// in Resend before @landyourleads.com addresses will work in production.
// Until then, set FROM_EMAIL env var to an address verified in Resend (e.g. onboarding@landyourleads.com).
// .trim() guards against trailing whitespace/newlines in env var values (e.g. from .env files)
const FROM_EMAIL = (process.env.FROM_EMAIL || 'onboarding@landyourleads.com').trim()
const COMPANY_NAME = 'LeadFlow AI'
const SUPPORT_EMAIL = 'support@landyourleads.com'

// Email Templates
const TEMPLATES = {
  renewal_success: {
    subject: '✅ Your LeadFlow subscription has been renewed',
    html: (data: any) => `
      <h2>Subscription Renewed Successfully</h2>
      <p>Hi ${data.customerName},</p>
      <p>Your <strong>${data.planTier}</strong> plan subscription has been successfully renewed.</p>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Plan:</strong> ${data.planTier}</p>
        <p><strong>Amount:</strong> $${data.amount}</p>
        <p><strong>Next billing date:</strong> ${data.nextBillingDate}</p>
        <p><strong>Invoice:</strong> <a href="${data.invoiceUrl}">View Invoice</a></p>
      </div>
      
      <p>Thank you for continuing to use LeadFlow AI!</p>
      <p>If you have any questions, reply to this email or contact us at ${SUPPORT_EMAIL}</p>
      
      <p>Best regards,<br>The LeadFlow Team</p>
    `
  },

  payment_failed: {
    subject: '⚠️ Payment failed for your LeadFlow subscription',
    html: (data: any) => `
      <h2>Payment Failed</h2>
      <p>Hi ${data.customerName},</p>
      <p>We were unable to process your payment for your <strong>${data.planTier}</strong> plan subscription.</p>
      
      <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
        <p><strong>Amount due:</strong> $${data.amount}</p>
        <p><strong>Attempt:</strong> ${data.attemptCount} of 3</p>
        ${data.attemptCount < 3 
          ? `<p><strong>Next retry:</strong> ${data.nextRetryDate}</p>` 
          : '<p><strong>Final attempt failed. Please update your payment method immediately.</strong></p>'
        }
      </div>
      
      <p><strong>Action Required:</strong></p>
      <p>Please update your payment method to avoid service interruption:</p>
      <p><a href="${data.portalUrl}" style="display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">Update Payment Method</a></p>
      
      ${data.attemptCount >= 3 
        ? '<p><strong>⚠️ Your subscription will be suspended if payment is not received within 7 days.</strong></p>' 
        : '<p>We will automatically retry the payment. No action is needed if you have sufficient funds.</p>'
      }
      
      <p>If you need assistance, please contact us at ${SUPPORT_EMAIL}</p>
      
      <p>Best regards,<br>The LeadFlow Team</p>
    `
  },

  subscription_cancelled: {
    subject: '😢 Your LeadFlow subscription has been cancelled',
    html: (data: any) => `
      <h2>Subscription Cancelled</h2>
      <p>Hi ${data.customerName},</p>
      <p>We're sorry to see you go! Your <strong>${data.planTier}</strong> plan subscription has been cancelled.</p>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Cancellation date:</strong> ${data.cancellationDate}</p>
        <p><strong>Service ends:</strong> ${data.serviceEndDate}</p>
        <p><strong>Reason:</strong> ${data.reason || 'Not specified'}</p>
      </div>
      
      <p><strong>What happens next?</strong></p>
      <ul>
        <li>You'll have access to your account until ${data.serviceEndDate}</li>
        <li>Your data will be preserved for 30 days</li>
        <li>You can reactivate anytime during this period</li>
      </ul>
      
      <p><strong>We'd love your feedback:</strong></p>
      <p>Can you tell us why you cancelled? Your feedback helps us improve.</p>
      <p><a href="${data.feedbackUrl}" style="display: inline-block; padding: 12px 24px; background: #6c757d; color: white; text-decoration: none; border-radius: 5px;">Share Feedback</a></p>
      
      <p><strong>Changed your mind?</strong></p>
      <p>You can reactivate your subscription anytime:</p>
      <p><a href="${data.portalUrl}" style="display: inline-block; padding: 12px 24px; background: #28a745; color: white; text-decoration: none; border-radius: 5px;">Reactivate Subscription</a></p>
      
      <p>Thank you for using LeadFlow AI!</p>
      
      <p>Best regards,<br>The LeadFlow Team</p>
    `
  },

  subscription_upgraded: {
    subject: '🎉 Your LeadFlow subscription has been upgraded',
    html: (data: any) => `
      <h2>Subscription Upgraded!</h2>
      <p>Hi ${data.customerName},</p>
      <p>Great news! Your subscription has been upgraded from <strong>${data.oldPlanTier}</strong> to <strong>${data.newPlanTier}</strong>.</p>
      
      <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
        <p><strong>New plan:</strong> ${data.newPlanTier}</p>
        <p><strong>New price:</strong> $${data.newAmount}/month</p>
        <p><strong>Prorated credit:</strong> $${data.prorationAmount}</p>
        <p><strong>Effective immediately</strong></p>
      </div>
      
      <p><strong>New features unlocked:</strong></p>
      <ul>
        ${data.newFeatures.map((f: string) => `<li>${f}</li>`).join('')}
      </ul>
      
      <p>Your new features are available now. Log in to start using them!</p>
      <p><a href="${data.dashboardUrl}" style="display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">Go to Dashboard</a></p>
      
      <p>Questions? Contact us at ${SUPPORT_EMAIL}</p>
      
      <p>Best regards,<br>The LeadFlow Team</p>
    `
  },

  subscription_downgraded: {
    subject: 'Your LeadFlow subscription has been changed',
    html: (data: any) => `
      <h2>Subscription Changed</h2>
      <p>Hi ${data.customerName},</p>
      <p>Your subscription has been changed from <strong>${data.oldPlanTier}</strong> to <strong>${data.newPlanTier}</strong>.</p>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>New plan:</strong> ${data.newPlanTier}</p>
        <p><strong>New price:</strong> $${data.newAmount}/month</p>
        <p><strong>Effective:</strong> ${data.effectiveDate}</p>
      </div>
      
      <p><strong>What's changing:</strong></p>
      <ul>
        <li>Your new plan features will be active on ${data.effectiveDate}</li>
        <li>You'll retain current features until then</li>
        <li>Your billing amount will be adjusted on next billing cycle</li>
      </ul>
      
      ${data.featureLoss && data.featureLoss.length > 0 ? `
        <p><strong>Features no longer available after ${data.effectiveDate}:</strong></p>
        <ul>
          ${data.featureLoss.map((f: string) => `<li>${f}</li>`).join('')}
        </ul>
      ` : ''}
      
      <p><strong>Want to keep your current plan?</strong></p>
      <p>You can change your subscription anytime:</p>
      <p><a href="${data.portalUrl}" style="display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">Manage Subscription</a></p>
      
      <p>Questions? Contact us at ${SUPPORT_EMAIL}</p>
      
      <p>Best regards,<br>The LeadFlow Team</p>
    `
  }
}

// Plan feature mapping
const PLAN_FEATURES: Record<string, string[]> = {
  starter: [
    '100 leads/month',
    'Basic AI responses',
    'Email support'
  ],
  pro: [
    '500 leads/month',
    'Advanced AI responses',
    'Priority support',
    'Analytics dashboard',
    'Cal.com integration'
  ],
  team: [
    'Unlimited leads',
    'Advanced AI responses',
    'Priority support',
    'Advanced analytics',
    'Team collaboration',
    'Custom integrations',
    'API access'
  ],
  brokerage: [
    'Unlimited leads',
    'White-label branding',
    'Dedicated support',
    'Advanced analytics',
    'Team management',
    'Custom integrations',
    'API access',
    'Custom AI training'
  ]
}

interface EmailData {
  customerName: string
  planTier: string
  amount?: number
  nextBillingDate?: string
  invoiceUrl?: string
  attemptCount?: number
  nextRetryDate?: string
  portalUrl?: string
  cancellationDate?: string
  serviceEndDate?: string
  reason?: string
  feedbackUrl?: string
  oldPlanTier?: string
  newPlanTier?: string
  newAmount?: number
  prorationAmount?: number
  newFeatures?: string[]
  dashboardUrl?: string
  effectiveDate?: string
  featureLoss?: string[]
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
 * Send email and log to database
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
    // If Resend not configured, return error — AC7 requires 500 with clear error, not silent success
    if (!resend) {
      logger.error(`Email send failed: RESEND_API_KEY not configured (${emailType} to ${to})`)
      return false
    }

    // Send email via Resend
    // Disable click tracking — Resend's redirect rewrites URLs through
    // us-east-1.resend-clicks.com which URL-encodes query params, breaking
    // reset tokens and other URLs with ?key=value parameters.
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: to,
      subject: subject,
      html: html,
      click_tracking: false
    })

    if (error) {
      logger.error(`Failed to send email (${emailType}) to ${to}`, error)
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

    logger.info(`Email sent (${emailType}) to ${to}`)
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
    logger.error(`Error sending email (${emailType})`, error)
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
 * Log email event to database
 */
async function logEmailEvent(event: EmailEvent): Promise<void> {
  try {
    await supabase.from('email_events').insert(event)
  } catch (error) {
    logger.error('Error logging email event', error)
  }
}

/**
 * Get plan features difference for upgrade/downgrade
 */
function getFeatureDifference(oldPlan: string, newPlan: string): { added: string[], removed: string[] } {
  const oldFeatures = PLAN_FEATURES[oldPlan] || []
  const newFeatures = PLAN_FEATURES[newPlan] || []
  
  const added = newFeatures.filter(f => !oldFeatures.includes(f))
  const removed = oldFeatures.filter(f => !newFeatures.includes(f))
  
  return { added, removed }
}

// Public API

export async function sendRenewalSuccessEmail(
  customerEmail: string,
  customerId: string,
  data: EmailData
): Promise<boolean> {
  const template = TEMPLATES.renewal_success
  const html = template.html(data)
  return sendEmail(customerEmail, template.subject, html, customerId, 'renewal_success', data)
}

export async function sendPaymentFailedEmail(
  customerEmail: string,
  customerId: string,
  data: EmailData
): Promise<boolean> {
  const template = TEMPLATES.payment_failed
  const html = template.html(data)
  return sendEmail(customerEmail, template.subject, html, customerId, 'payment_failed', data)
}

export async function sendSubscriptionCancelledEmail(
  customerEmail: string,
  customerId: string,
  data: EmailData
): Promise<boolean> {
  const template = TEMPLATES.subscription_cancelled
  const html = template.html(data)
  return sendEmail(customerEmail, template.subject, html, customerId, 'subscription_cancelled', data)
}

export async function sendSubscriptionUpgradedEmail(
  customerEmail: string,
  customerId: string,
  data: EmailData
): Promise<boolean> {
  const { added } = getFeatureDifference(data.oldPlanTier || '', data.newPlanTier || '')
  data.newFeatures = added
  
  const template = TEMPLATES.subscription_upgraded
  const html = template.html(data)
  return sendEmail(customerEmail, template.subject, html, customerId, 'subscription_upgraded', data)
}

export async function sendSubscriptionDowngradedEmail(
  customerEmail: string,
  customerId: string,
  data: EmailData
): Promise<boolean> {
  const { removed } = getFeatureDifference(data.oldPlanTier || '', data.newPlanTier || '')
  data.featureLoss = removed
  
  const template = TEMPLATES.subscription_downgraded
  const html = template.html(data)
  return sendEmail(customerEmail, template.subject, html, customerId, 'subscription_downgraded', data)
}


interface PasswordResetEmailData {
  agentName?: string
  resetUrl: string
}

/**
 * Send a password reset email to the agent.
 * UC: fix-no-forgot-password-flow
 *
 * @param agentEmail - Recipient email address
 * @param agentId    - Agent UUID (used for email event logging)
 * @param data       - { agentName?, resetUrl }
 */
export async function sendPasswordResetEmail(
  agentEmail: string,
  agentId: string,
  data: PasswordResetEmailData
): Promise<boolean> {
  const subject = 'Reset your LeadFlow AI password'
  const greeting = data.agentName ? `Hi ${data.agentName},` : 'Hi there,'

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0f172a; margin: 0; padding: 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background: #0f172a; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background: #1e293b; border-radius: 12px; border: 1px solid #334155; overflow: hidden; max-width: 600px; width: 100%;">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #064e3b, #1e293b); padding: 32px; text-align: center; border-bottom: 1px solid #334155;">
                  <span style="color: #10b981; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">▶ LeadFlow AI</span>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding: 40px 32px;">
                  <p style="color: #94a3b8; font-size: 16px; margin: 0 0 8px;">${greeting}</p>
                  <p style="color: #e2e8f0; font-size: 16px; margin: 0 0 24px;">
                    We received a request to reset your LeadFlow AI password. Click the button below to choose a new one.
                  </p>
                  <!-- CTA Button -->
                  <table cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                    <tr>
                      <td align="center">
                        <a href="${data.resetUrl}"
                           style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #10b981, #059669); color: white; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; letter-spacing: 0.2px;">
                          Reset My Password
                        </a>
                      </td>
                    </tr>
                  </table>
                  <!-- Security Note -->
                  <div style="background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 16px; margin-top: 24px;">
                    <p style="color: #64748b; font-size: 13px; margin: 0 0 8px;">
                      🔒 <strong style="color: #94a3b8;">Security note:</strong> This link expires in <strong>1 hour</strong>.
                    </p>
                    <p style="color: #64748b; font-size: 13px; margin: 0;">
                      If you didn't request a password reset, you can safely ignore this email — your password won't change.
                    </p>
                  </div>
                  <!-- Fallback URL -->
                  <p style="color: #64748b; font-size: 12px; margin-top: 24px;">
                    If the button doesn't work, copy and paste this URL into your browser:<br />
                    <a href="${data.resetUrl}" style="color: #10b981; word-break: break-all;">${data.resetUrl}</a>
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="border-top: 1px solid #334155; padding: 24px 32px; text-align: center;">
                  <p style="color: #475569; font-size: 12px; margin: 0;">
                    Need help? Email us at
                    <a href="mailto:${SUPPORT_EMAIL}" style="color: #64748b;">${SUPPORT_EMAIL}</a>
                  </p>
                  <p style="color: #334155; font-size: 11px; margin: 8px 0 0;">
                    &copy; ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `

  return sendEmail(agentEmail, subject, html, agentId, 'password_reset', {
    agentName: data.agentName,
    resetUrl: data.resetUrl,
  })
}


interface WelcomeEmailData {
  agentName?: string
  planTier?: 'trial' | 'pilot' | string
  dashboardUrl?: string
}

/**
 * Send a welcome email to a newly signed-up agent.
 * UC: feat-transactional-email-resend
 *
 * @param agentEmail - Recipient email address
 * @param agentId    - Agent UUID (used for email event logging)
 * @param data       - { agentName?, planTier?, dashboardUrl? }
 */
export async function sendWelcomeEmail(
  agentEmail: string,
  agentId: string,
  data: WelcomeEmailData = {}
): Promise<boolean> {
  const subject = '🎉 Welcome to LeadFlow AI — Your Account is Ready'
  const firstName = data.agentName?.split(' ')[0] || 'there'
  const dashboardUrl = data.dashboardUrl || 'https://leadflow-ai-five.vercel.app/setup'
  const isPilot = data.planTier === 'pilot'
  const trialDays = isPilot ? 60 : 30

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0f172a; margin: 0; padding: 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background: #0f172a; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background: #1e293b; border-radius: 12px; border: 1px solid #334155; overflow: hidden; max-width: 600px; width: 100%;">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #064e3b, #1e293b); padding: 32px; text-align: center; border-bottom: 1px solid #334155;">
                  <span style="color: #10b981; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">▶ LeadFlow AI</span>
                  <p style="color: #6ee7b7; font-size: 14px; margin: 8px 0 0;">AI Lead Response in &lt;30 Seconds</p>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding: 40px 32px;">
                  <h2 style="color: #f1f5f9; font-size: 22px; margin: 0 0 8px;">Hi ${firstName}, welcome aboard! 🎉</h2>
                  <p style="color: #94a3b8; font-size: 16px; margin: 0 0 24px;">
                    Your LeadFlow AI account is ready. You have <strong style="color: #10b981;">${trialDays} days free</strong> to see exactly what happens when AI responds to your leads in under 30 seconds.
                  </p>

                  <!-- What happens next -->
                  <div style="background: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 24px; margin: 0 0 28px;">
                    <p style="color: #10b981; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 16px;">What happens next</p>
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td width="32" valign="top" style="padding: 0 12px 16px 0;">
                          <span style="display: inline-block; width: 24px; height: 24px; background: #10b981; color: white; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700;">1</span>
                        </td>
                        <td style="padding-bottom: 16px;">
                          <p style="color: #e2e8f0; font-size: 15px; margin: 0 0 4px; font-weight: 600;">Connect your Follow Up Boss account</p>
                          <p style="color: #64748b; font-size: 13px; margin: 0;">Takes 2 minutes — just paste your FUB API key</p>
                        </td>
                      </tr>
                      <tr>
                        <td width="32" valign="top" style="padding: 0 12px 16px 0;">
                          <span style="display: inline-block; width: 24px; height: 24px; background: #10b981; color: white; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700;">2</span>
                        </td>
                        <td style="padding-bottom: 16px;">
                          <p style="color: #e2e8f0; font-size: 15px; margin: 0 0 4px; font-weight: 600;">Set up your AI response number</p>
                          <p style="color: #64748b; font-size: 13px; margin: 0;">Choose a local number — leads see it as your number</p>
                        </td>
                      </tr>
                      <tr>
                        <td width="32" valign="top" style="padding: 0 12px 0 0;">
                          <span style="display: inline-block; width: 24px; height: 24px; background: #10b981; color: white; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700;">3</span>
                        </td>
                        <td>
                          <p style="color: #e2e8f0; font-size: 15px; margin: 0 0 4px; font-weight: 600;">Watch your first AI response happen live</p>
                          <p style="color: #64748b; font-size: 13px; margin: 0;">We'll simulate it for you in the onboarding wizard</p>
                        </td>
                      </tr>
                    </table>
                  </div>

                  <!-- CTA -->
                  <table cellpadding="0" cellspacing="0" style="margin: 0 0 32px;">
                    <tr>
                      <td align="center">
                        <a href="${dashboardUrl}"
                           style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #10b981, #059669); color: white; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 700; letter-spacing: 0.2px;">
                          Start Onboarding →
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Founder note -->
                  <div style="border-top: 1px solid #334155; padding-top: 24px;">
                    <p style="color: #64748b; font-size: 14px; line-height: 1.7; margin: 0 0 8px;">
                      If you have any questions at all, just reply to this email — I read every one personally.
                    </p>
                    <p style="color: #94a3b8; font-size: 14px; margin: 0;">
                      — Stojan, founder of LeadFlow AI
                    </p>
                  </div>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="border-top: 1px solid #334155; padding: 24px 32px; text-align: center;">
                  <p style="color: #475569; font-size: 12px; margin: 0;">
                    Need help? Email us at
                    <a href="mailto:${SUPPORT_EMAIL}" style="color: #64748b;">${SUPPORT_EMAIL}</a>
                  </p>
                  <p style="color: #334155; font-size: 11px; margin: 8px 0 0;">
                    &copy; ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `

  return sendEmail(agentEmail, subject, html, agentId, 'welcome', {
    agentName: data.agentName,
    planTier: data.planTier,
  })
}

interface PilotInviteEmailData {
  agentName: string
  message?: string
  inviteUrl: string
  expiresAt: string
}

/**
 * Send a pilot invite email (direct recruitment).
 * UC: feat-admin-pilot-invite-flow
 *
 * @param agentEmail - Recipient email address
 * @param agentId    - Agent UUID (used for email event logging)
 * @param data       - { agentName, message?, inviteUrl, expiresAt }
 */
export async function sendPilotInviteEmail(
  agentEmail: string,
  agentId: string,
  data: PilotInviteEmailData
): Promise<boolean> {
  const subject = `You're invited to pilot LeadFlow AI, ${data.agentName}`
  
  const expirationDate = new Date(data.expiresAt).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0f172a; margin: 0; padding: 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background: #0f172a; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background: #1e293b; border-radius: 12px; border: 1px solid #334155; overflow: hidden; max-width: 600px; width: 100%;">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #064e3b, #1e293b); padding: 32px; text-align: center; border-bottom: 1px solid #334155;">
                  <span style="color: #10b981; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">▶ LeadFlow AI</span>
                  <p style="color: #6ee7b7; font-size: 14px; margin: 8px 0 0;">AI Lead Response in &lt;30 Seconds</p>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding: 40px 32px;">
                  <h2 style="color: #f1f5f9; font-size: 22px; margin: 0 0 8px;">Hi ${data.agentName},</h2>
                  <p style="color: #94a3b8; font-size: 16px; margin: 0 0 24px;">
                    I'd like to personally invite you to try <strong>LeadFlow AI</strong> as a pilot partner.
                  </p>

                  ${data.message ? `
                  <div style="background: #0f172a; border-left: 4px solid #10b981; border-radius: 4px; padding: 16px; margin: 0 0 28px;">
                    <p style="color: #e2e8f0; font-size: 15px; line-height: 1.6; margin: 0; font-style: italic;">
                      "${data.message}"
                    </p>
                  </div>
                  ` : ''}

                  <!-- Value proposition -->
                  <div style="background: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 24px; margin: 0 0 28px;">
                    <p style="color: #10b981; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 16px;">Why LeadFlow</p>
                    <ul style="margin: 0; padding-left: 20px;">
                      <li style="color: #e2e8f0; font-size: 14px; margin-bottom: 10px; line-height: 1.5;">Responds to your leads via SMS in <strong>&lt;30 seconds</strong></li>
                      <li style="color: #e2e8f0; font-size: 14px; margin-bottom: 10px; line-height: 1.5;">Integrates seamlessly with Follow Up Boss</li>
                      <li style="color: #e2e8f0; font-size: 14px; margin-bottom: 10px; line-height: 1.5;">Books appointments automatically via Cal.com</li>
                      <li style="color: #e2e8f0; font-size: 14px; line-height: 1.5;">As a pilot partner, you get <strong>free access</strong> during the pilot period</li>
                    </ul>
                  </div>

                  <!-- Benefits -->
                  <div style="background: linear-gradient(135deg, #0f4c3a, #0d3a2e); border: 1px solid #10b981; border-radius: 10px; padding: 24px; margin: 0 0 28px;">
                    <p style="color: #10b981; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 16px;">As a Pilot Partner</p>
                    <ul style="margin: 0; padding-left: 20px;">
                      <li style="color: #6ee7b7; font-size: 14px; margin-bottom: 10px;">Free access during pilot period</li>
                      <li style="color: #6ee7b7; font-size: 14px; margin-bottom: 10px;">Direct line to me for feedback</li>
                      <li style="color: #6ee7b7; font-size: 14px;">Priority pricing when we launch</li>
                    </ul>
                  </div>

                  <!-- CTA -->
                  <table cellpadding="0" cellspacing="0" style="margin: 0 0 24px;">
                    <tr>
                      <td align="center">
                        <a href="${data.inviteUrl}"
                           style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #10b981, #059669); color: white; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 700; letter-spacing: 0.2px;">
                          Accept Your Invite
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Fallback link -->
                  <p style="color: #64748b; font-size: 12px; margin-top: 16px; text-align: center;">
                    Or copy this link:<br />
                    <a href="${data.inviteUrl}" style="color: #10b981; word-break: break-all; font-size: 11px;">${data.inviteUrl}</a>
                  </p>

                  <!-- Expiration -->
                  <div style="border-top: 1px solid #334155; padding-top: 24px; margin-top: 24px;">
                    <p style="color: #94a3b8; font-size: 13px; margin: 0;">
                      ⏱️ This link expires <strong>${expirationDate}</strong>.
                    </p>
                  </div>

                  <!-- Founder note -->
                  <p style="color: #64748b; font-size: 14px; line-height: 1.7; margin-top: 16px; margin-bottom: 0;">
                    Can't wait to hear what you think!<br />
                    <strong style="color: #94a3b8;">Stojan</strong><br />
                    <span style="font-size: 12px;">Founder, LeadFlow AI</span>
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="border-top: 1px solid #334155; padding: 24px 32px; text-align: center;">
                  <p style="color: #475569; font-size: 12px; margin: 0;">
                    Need help? Email us at
                    <a href="mailto:${SUPPORT_EMAIL}" style="color: #64748b;">${SUPPORT_EMAIL}</a>
                  </p>
                  <p style="color: #334155; font-size: 11px; margin: 8px 0 0;">
                    &copy; ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `

  return sendEmail(agentEmail, subject, html, agentId, 'pilot_invite', {
    agentName: data.agentName,
    message: data.message,
    inviteUrl: data.inviteUrl,
  })
}

// Pilot Lifecycle Emails (White-Glove Onboarding)

export async function sendPilotWelcomeEmail(
  agentEmail: string,
  agentName: string,
  dashboardUrl: string
): Promise<boolean> {
  const subject = `You're in! Here's how to set up your AI (takes 10 min)`

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background: #f5f5f5; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 8px; max-width: 600px; width: 100%;">
              <tr>
                <td style="padding: 40px 32px;">
                  <h2 style="color: #1a202c; font-size: 24px; margin: 0 0 16px;">Welcome, ${agentName}! 🎉</h2>
                  <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                    You're now part of the LeadFlow AI pilot program. Your AI is ready to respond to leads in under 30 seconds.
                  </p>

                  <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                    <strong>Here's what's next (takes 10 minutes):</strong>
                  </p>

                  <ol style="color: #4a5568; font-size: 16px; line-height: 2;">
                    <li><strong>Connect your Follow Up Boss account</strong> — this is where your leads come from</li>
                    <li><strong>Configure your AI's personality</strong> — we'll ask about your market, approach, and goals</li>
                    <li><strong>Send a test lead</strong> — see the AI respond in real-time</li>
                  </ol>

                  <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 24px 0;">
                    <a href="${dashboardUrl}" style="display: inline-block; padding: 12px 32px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; font-weight: 600;">Get Started</a>
                  </p>

                  <p style="color: #718096; font-size: 14px; line-height: 1.6; margin: 24px 0 0;">
                    Questions? Reply to this email or reach me directly at stojan@landyourleads.com<br />
                    <strong>I'm here to make sure this works perfectly for you.</strong>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="border-top: 1px solid #e2e8f0; padding: 24px 32px; text-align: center;">
                  <p style="color: #718096; font-size: 12px; margin: 0;">
                    &copy; ${new Date().getFullYear()} LeadFlow AI. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `

  return sendEmail(agentEmail, subject, html, '', 'pilot_welcome', {
    agentName,
  })
}

export async function sendPilotSetupCompleteEmail(
  agentEmail: string,
  agentName: string,
  dashboardUrl: string
): Promise<boolean> {
  const subject = `Your AI is live — here's how to test it right now`

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background: #f5f5f5; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 8px; max-width: 600px; width: 100%;">
              <tr>
                <td style="padding: 40px 32px;">
                  <h2 style="color: #1a202c; font-size: 24px; margin: 0 0 16px;">Your AI is Live! 🚀</h2>
                  <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                    Great news, ${agentName} — your setup is complete. Your AI is now connected to Follow Up Boss and ready to respond to leads.
                  </p>

                  <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                    <strong>Test it right now:</strong>
                  </p>

                  <ol style="color: #4a5568; font-size: 16px; line-height: 2;">
                    <li>Go to your Follow Up Boss dashboard</li>
                    <li>Create a test lead (or forward a real one)</li>
                    <li>Watch as the AI responds in under 30 seconds</li>
                  </ol>

                  <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 24px 0;">
                    <a href="${dashboardUrl}" style="display: inline-block; padding: 12px 32px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; font-weight: 600;">View Your Dashboard</a>
                  </p>

                  <p style="color: #718096; font-size: 14px; line-height: 1.6; margin: 24px 0 0;">
                    Let me know how it goes! Email stojan@landyourleads.com or reply to this message.<br />
                    <strong>Excited to see your AI at work.</strong>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="border-top: 1px solid #e2e8f0; padding: 24px 32px; text-align: center;">
                  <p style="color: #718096; font-size: 12px; margin: 0;">
                    &copy; ${new Date().getFullYear()} LeadFlow AI. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `

  return sendEmail(agentEmail, subject, html, '', 'pilot_setup_complete', {
    agentName,
  })
}

export async function sendPilotAhaMomentEmail(
  agentEmail: string,
  agentName: string,
  dashboardUrl: string
): Promise<boolean> {
  const subject = `Your AI just responded to a real lead in 18 seconds 🎯`

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background: #f5f5f5; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 8px; max-width: 600px; width: 100%;">
              <tr>
                <td style="padding: 40px 32px;">
                  <h2 style="color: #1a202c; font-size: 28px; margin: 0 0 16px;">It Works! 🎉</h2>
                  <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                    ${agentName}, your AI just responded to a real lead in 18 seconds. No delays. No waiting. Just instant, personalized outreach.
                  </p>

                  <div style="background: #f0fdf4; border-left: 4px solid #10b981; border-radius: 4px; padding: 16px; margin: 24px 0;">
                    <p style="color: #1a202c; font-size: 16px; margin: 0;">
                      <strong>This is exactly what your customers need.</strong> And it's working right now for you.
                    </p>
                  </div>

                  <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 24px 0;">
                    <a href="${dashboardUrl}" style="display: inline-block; padding: 12px 32px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; font-weight: 600;">See Your Responses</a>
                  </p>

                  <p style="color: #718096; font-size: 14px; line-height: 1.6; margin: 24px 0 0;">
                    Ready to go live with paying leads? Let's talk about moving to a paid plan.<br />
                    Reply to this email or email stojan@landyourleads.com anytime.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="border-top: 1px solid #e2e8f0; padding: 24px 32px; text-align: center;">
                  <p style="color: #718096; font-size: 12px; margin: 0;">
                    &copy; ${new Date().getFullYear()} LeadFlow AI. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `

  return sendEmail(agentEmail, subject, html, '', 'pilot_aha_moment', {
    agentName,
  })
}

export async function sendPilotTrialCTAEmail(
  agentEmail: string,
  agentName: string,
  dashboardUrl: string,
  upgradeUrl: string
): Promise<boolean> {
  const subject = `Your AI is working. Ready to keep it running?`

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background: #f5f5f5; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 8px; max-width: 600px; width: 100%;">
              <tr>
                <td style="padding: 40px 32px;">
                  <h2 style="color: #1a202c; font-size: 24px; margin: 0 0 16px;">Ready for the Next Step?</h2>
                  <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                    Hi ${agentName},
                  </p>

                  <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                    You've seen it work. Your AI is responding to leads instantly, generating follow-ups your competition is sleeping on.
                  </p>

                  <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                    <strong>It's time to make it permanent.</strong>
                  </p>

                  <div style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; padding: 16px; margin: 24px 0;">
                    <p style="color: #1a202c; font-size: 16px; margin: 0;">
                      <strong>Pricing starts at $49/mo</strong> for the Starter plan (100 SMS) and scales up from there. <a href="${upgradeUrl}" style="color: #d97706; font-weight: 600;">See all plans</a>.
                    </p>
                  </div>

                  <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 24px 0;">
                    <a href="${upgradeUrl}" style="display: inline-block; padding: 12px 32px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; font-weight: 600;">Upgrade Now</a>
                  </p>

                  <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 24px 0 0;">
                    Questions about plans or features? <a href="mailto:stojan@landyourleads.com" style="color: #0891b2;">Email me</a> directly.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="border-top: 1px solid #e2e8f0; padding: 24px 32px; text-align: center;">
                  <p style="color: #718096; font-size: 12px; margin: 0;">
                    &copy; ${new Date().getFullYear()} LeadFlow AI. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `

  return sendEmail(agentEmail, subject, html, '', 'pilot_trial_cta', {
    agentName,
  })
}

// Trial Aha Moment Emails (UC: uc-revenue-aha-moment)

interface AhaMomentEmailData {
  agentName?: string
  simulatorUrl?: string
}

/**
 * Send day-1 "See Your AI in Action" email after verification.
 * UC: uc-revenue-aha-moment — R3
 *
 * @param agentEmail - Recipient email address
 * @param agentId    - Agent UUID (used for email event logging)
 * @param data       - { agentName?, simulatorUrl? }
 */
export async function sendAhaMomentDay1Email(
  agentEmail: string,
  agentId: string,
  data: AhaMomentEmailData = {}
): Promise<boolean> {
  const subject = 'Your AI is ready — watch it handle a lead right now'
  const firstName = data.agentName?.split(' ')[0] || 'there'
  const simulatorUrl = data.simulatorUrl || 'https://leadflow-ai-five.vercel.app/setup/simulator'

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0f172a; margin: 0; padding: 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background: #0f172a; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background: #1e293b; border-radius: 12px; border: 1px solid #334155; overflow: hidden; max-width: 600px; width: 100%;">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #7c3aed, #1e293b); padding: 32px; text-align: center; border-bottom: 1px solid #334155;">
                  <span style="color: #a78bfa; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">▶ LeadFlow AI</span>
                  <p style="color: #c4b5fd; font-size: 14px; margin: 8px 0 0;">AI Lead Response in &lt;30 Seconds</p>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding: 40px 32px;">
                  <h2 style="color: #f1f5f9; font-size: 22px; margin: 0 0 8px;">Hi ${firstName}, your AI is ready! 🚀</h2>
                  <p style="color: #94a3b8; font-size: 16px; margin: 0 0 24px;">
                    Your LeadFlow AI account is live. No setup required — watch your AI respond to a lead in 30 seconds.
                  </p>

                  <!-- AI Response Preview -->
                  <div style="background: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 24px; margin: 0 0 28px;">
                    <p style="color: #a78bfa; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 16px;">Sample AI Response</p>
                    <div style="background: #1e293b; border-radius: 8px; padding: 16px; border-left: 3px solid #a78bfa;">
                      <p style="color: #e2e8f0; font-size: 14px; margin: 0 0 8px; font-style: italic;">
                        "Hi Sarah! 👋 I'm your AI assistant from LeadFlow. I'd love to help you with buying a home. I can show you our latest listings and help schedule a viewing. Are you looking to buy in the next 1–3 months?"
                      </p>
                      <p style="color: #64748b; font-size: 12px; margin: 0;">
                        — AI response generated in <strong style="color: #a78bfa;">under 30 seconds</strong>
                      </p>
                    </div>
                  </div>

                  <!-- CTA -->
                  <table cellpadding="0" cellspacing="0" style="margin: 0 0 32px;">
                    <tr>
                      <td align="center">
                        <a href="${simulatorUrl}"
                           style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: white; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 700; letter-spacing: 0.2px;">
                          Watch a 30-Second Demo →
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- No setup needed -->
                  <div style="background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 16px; margin: 0 0 24px;">
                    <p style="color: #64748b; font-size: 13px; margin: 0;">
                      ✅ No FUB connection needed<br/>
                      ✅ No phone number required<br/>
                      ✅ No credit card required
                    </p>
                  </div>

                  <!-- Founder note -->
                  <div style="border-top: 1px solid #334155; padding-top: 24px;">
                    <p style="color: #64748b; font-size: 14px; line-height: 1.7; margin: 0 0 8px;">
                      This demo is the best way to see exactly what your leads will experience.
                    </p>
                    <p style="color: #94a3b8; font-size: 14px; margin: 0;">
                      — Stojan, founder of LeadFlow AI
                    </p>
                  </div>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="border-top: 1px solid #334155; padding: 24px 32px; text-align: center;">
                  <p style="color: #475569; font-size: 12px; margin: 0;">
                    Need help? Email us at
                    <a href="mailto:${SUPPORT_EMAIL}" style="color: #64748b;">${SUPPORT_EMAIL}</a>
                  </p>
                  <p style="color: #334155; font-size: 11px; margin: 8px 0 0;">
                    &copy; ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `

  return sendEmail(agentEmail, subject, html, agentId, 'aha_moment_day1', {
    agentName: data.agentName,
  })
}

/**
 * Send day-3 re-engagement email for agents who haven't seen the simulator.
 * UC: uc-revenue-aha-moment — R4
 *
 * @param agentEmail - Recipient email address
 * @param agentId    - Agent UUID (used for email event logging)
 * @param data       - { agentName?, simulatorUrl? }
 */
export async function sendAhaMomentDay3Email(
  agentEmail: string,
  agentId: string,
  data: AhaMomentEmailData = {}
): Promise<boolean> {
  const subject = '3 days in — have you seen your AI respond yet?'
  const firstName = data.agentName?.split(' ')[0] || 'there'
  const simulatorUrl = data.simulatorUrl || 'https://leadflow-ai-five.vercel.app/setup/simulator'

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0f172a; margin: 0; padding: 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background: #0f172a; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background: #1e293b; border-radius: 12px; border: 1px solid #334155; overflow: hidden; max-width: 600px; width: 100%;">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #f59e0b, #1e293b); padding: 32px; text-align: center; border-bottom: 1px solid #334155;">
                  <span style="color: #fcd34d; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">▶ LeadFlow AI</span>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding: 40px 32px;">
                  <h2 style="color: #f1f5f9; font-size: 22px; margin: 0 0 8px;">Hi ${firstName}, quick question...</h2>
                  <p style="color: #94a3b8; font-size: 16px; margin: 0 0 24px;">
                    Have you seen your AI respond to a lead yet?
                  </p>

                  <!-- The hook -->
                  <div style="background: #0f172a; border-left: 4px solid #f59e0b; border-radius: 4px; padding: 20px; margin: 0 0 28px;">
                    <p style="color: #e2e8f0; font-size: 15px; margin: 0 0 12px;">
                      <strong>80% of agents who see the demo upgrade within a week.</strong>
                    </p>
                    <p style="color: #94a3b8; font-size: 14px; margin: 0;">
                      It takes 30 seconds. No setup required. Just watch your AI handle a lead inquiry.
                    </p>
                  </div>

                  <!-- CTA -->
                  <table cellpadding="0" cellspacing="0" style="margin: 0 0 32px;">
                    <tr>
                      <td align="center">
                        <a href="${simulatorUrl}"
                           style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 700; letter-spacing: 0.2px;">
                          Watch the 30-Second Demo →
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Social proof -->
                  <div style="background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 16px; margin: 0 0 24px;">
                    <p style="color: #64748b; font-size: 13px; margin: 0 0 8px; font-style: italic;">
                      "I watched the demo and immediately understood the value. My AI responds faster than I ever could."
                    </p>
                    <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                      — Sarah M., Real Estate Agent
                    </p>
                  </div>

                  <!-- Founder note -->
                  <div style="border-top: 1px solid #334155; padding-top: 24px;">
                    <p style="color: #64748b; font-size: 14px; line-height: 1.7; margin: 0 0 8px;">
                      I built this demo because it's the fastest way to see what LeadFlow can do for your business.
                    </p>
                    <p style="color: #94a3b8; font-size: 14px; margin: 0;">
                      — Stojan
                    </p>
                  </div>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="border-top: 1px solid #334155; padding: 24px 32px; text-align: center;">
                  <p style="color: #475569; font-size: 12px; margin: 0;">
                    Need help? Email us at
                    <a href="mailto:${SUPPORT_EMAIL}" style="color: #64748b;">${SUPPORT_EMAIL}</a>
                  </p>
                  <p style="color: #334155; font-size: 11px; margin: 8px 0 0;">
                    &copy; ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `

  return sendEmail(agentEmail, subject, html, agentId, 'aha_moment_day3', {
    agentName: data.agentName,
  })
}
