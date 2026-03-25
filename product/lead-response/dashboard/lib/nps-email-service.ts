/**
 * NPS Survey Email Service
 * Extends email-service.ts with NPS-specific email templates
 * feat-nps-agent-feedback
 */

import { supabaseServer as supabase } from '@/lib/supabase-server'

// Lazy-load Resend to avoid build error when package isn't installed
let _resend: any = null
async function getResend() {
  if (_resend) return _resend
  if (!process.env.RESEND_API_KEY) return null
  try {
    const { Resend } = await import('resend') // resend is installed; falls through to catch if missing
    _resend = new Resend(process.env.RESEND_API_KEY!.trim())
    return _resend
  } catch {
    return null
  }
}

// Use Resend's shared domain as fallback — leadflow.ai must be verified on Resend first.
// .trim() guards against trailing whitespace/newlines in env var values
const FROM_EMAIL = (process.env.FROM_EMAIL || 'onboarding@resend.dev').trim()
const COMPANY_NAME = 'LeadFlow AI'
const SUPPORT_EMAIL = 'support@leadflow.ai'
const DASHBOARD_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-five.vercel.app'

// NPS Email Template
const NPS_EMAIL_TEMPLATE = {
  subject: 'Quick question: How likely are you to recommend LeadFlow AI?',
  text: (data: { name: string; surveyUrl: string }) => `Hi ${data.name},

You've been using LeadFlow AI for a couple of weeks now, and we'd love to hear your thoughts.

How likely are you to recommend LeadFlow AI to another real estate agent?

${data.surveyUrl}

It takes less than 30 seconds. Your feedback helps us improve.

Thanks,
The LeadFlow Team

---
Questions? Reply to this email or contact us at ${SUPPORT_EMAIL}
`,
  html: (data: { name: string; surveyUrl: string }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NPS Survey</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="100%" max-width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1a1a1a;">Hi ${data.name},</h1>
              
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                You've been using LeadFlow AI for a couple of weeks now, and we'd love to hear your thoughts.
              </p>
              
              <p style="margin: 0 0 24px; font-size: 18px; font-weight: 500; color: #1a1a1a;">
                How likely are you to recommend LeadFlow AI to another real estate agent?
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 32px 0;">
                <tr>
                  <td align="center">
                    <a href="${data.surveyUrl}" 
                       style="display: inline-block; padding: 16px 32px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 500;">
                      Share Your Feedback (30 seconds)
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0; font-size: 14px; color: #6a6a6a; text-align: center;">
                Your feedback helps us improve.
              </p>
              
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">
              
              <p style="margin: 0; font-size: 14px; color: #6a6a6a;">
                Thanks,<br>
                The LeadFlow Team
              </p>
              
              <p style="margin: 16px 0 0; font-size: 12px; color: #9a9a9a;">
                Questions? Reply to this email or contact us at ${SUPPORT_EMAIL}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`,
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
 * Send NPS survey email
 */
export async function sendNPSSurveyEmail(
  to: string,
  customerId: string,
  name: string,
  surveyToken: string
): Promise<boolean> {
  const surveyUrl = `${DASHBOARD_URL}/survey/nps?token=${encodeURIComponent(surveyToken)}`
  
  const subject = NPS_EMAIL_TEMPLATE.subject
  const textBody = NPS_EMAIL_TEMPLATE.text({ name, surveyUrl })
  const htmlBody = NPS_EMAIL_TEMPLATE.html({ name, surveyUrl })

  try {
    const resend = await getResend()
    
    // If Resend not configured, log and return success (for testing)
    if (!resend) {
      console.log(`📧 NPS Survey email queued (Resend not configured): to ${to}`)
      console.log(`   Survey URL: ${surveyUrl}`)
      await logEmailEvent({
        customer_id: customerId,
        email_type: 'nps_survey',
        recipient: to,
        subject,
        status: 'queued',
        metadata: { survey_url: surveyUrl },
      })
      return true
    }

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: to,
      subject,
      text: textBody,
      html: htmlBody,
    })

    if (error) {
      console.error(`❌ Failed to send NPS survey email to ${to}:`, error)
      await logEmailEvent({
        customer_id: customerId,
        email_type: 'nps_survey',
        recipient: to,
        subject,
        status: 'failed',
        error_message: error.message,
        metadata: { survey_url: surveyUrl },
      })
      return false
    }

    console.log(`✅ NPS survey email sent to ${to}`)
    await logEmailEvent({
      customer_id: customerId,
      email_type: 'nps_survey',
      recipient: to,
      subject,
      status: 'sent',
      sent_at: new Date().toISOString(),
      metadata: { survey_url: surveyUrl, resend_id: data?.id },
    })

    return true
  } catch (error: any) {
    console.error(`❌ Error sending NPS survey email:`, error)
    await logEmailEvent({
      customer_id: customerId,
      email_type: 'nps_survey',
      recipient: to,
      subject,
      status: 'failed',
      error_message: error.message,
      metadata: { survey_url: surveyUrl },
    })
    return false
  }
}

/**
 * Send batch NPS survey emails to agents due for survey
 * This is called by the cron job
 */
export async function sendBatchNPSSurveys(
  agents: { agent_id: string; email: string; name: string; trigger: 'auto_14d' | 'auto_90d' }[],
  generateToken: (agentId: string, trigger: 'auto_14d' | 'auto_90d') => string
): Promise<{
  sent: number
  failed: number
  errors: string[]
}> {
  const results = { sent: 0, failed: 0, errors: [] as string[] }

  for (const agent of agents) {
    try {
      const token = generateToken(agent.agent_id, agent.trigger)
      const success = await sendNPSSurveyEmail(
        agent.email,
        agent.agent_id,
        agent.name,
        token
      )

      if (success) {
        results.sent++
      } else {
        results.failed++
        results.errors.push(`Failed to send to ${agent.email}`)
      }
    } catch (error: any) {
      results.failed++
      results.errors.push(`Error sending to ${agent.email}: ${error.message}`)
    }
  }

  return results
}
