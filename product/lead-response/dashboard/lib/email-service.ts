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
    // @ts-expect-error — resend may not be installed; caught at runtime
    const { Resend } = await import('resend')
    _resend = new Resend(process.env.RESEND_API_KEY)
    return _resend
  } catch {
    return null
  }
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'billing@leadflow.ai'
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
