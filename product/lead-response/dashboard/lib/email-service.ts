/**
 * Email Service for Subscription Lifecycle Events
 * UC-11: Subscription Lifecycle Management
 */

import { supabaseServer as supabase } from '@/lib/supabase-server'

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

// Use Resend's shared domain as fallback — leadflow.ai domain must be verified
// in Resend before @leadflow.ai addresses will work in production.
// Until then, set FROM_EMAIL env var to a verified address (e.g. onboarding@resend.dev).
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev'
const COMPANY_NAME = 'LeadFlow AI'
const SUPPORT_EMAIL = 'support@leadflow.ai'

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
    // If Resend not configured, log and return success (for testing)
    if (!resend) {
      console.log(`📧 Email queued (Resend not configured): ${emailType} to ${to}`)
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
      from: FROM_EMAIL,
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
