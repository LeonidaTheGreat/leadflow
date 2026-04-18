/**
 * Pilot Outreach Email Service
 *
 * Sends personalized outreach emails to pilot_recruitment_targets via Resend.
 * Template follows the content brief: plain/personal, no logo, Segment A/B.
 */

import { postgrestAdmin } from '@/lib/db'
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

const FROM_EMAIL = (process.env.OUTREACH_FROM_EMAIL || process.env.FROM_EMAIL || 'onboarding@resend.dev').trim()
// From display name follows content brief: "Stojan Madjunkov" (not LeadFlow AI)
const FROM_DISPLAY = `Stojan Madjunkov <${FROM_EMAIL}>`

export interface PilotOutreachEmailData {
  firstName: string
  location: string
  painPoint: string
  demoLink: string
  isTeamLead?: boolean
}

/**
 * Send personalized pilot outreach email to a recruitment target.
 * Subject: "{firstName}, you mentioned this" (Option A from content brief).
 * Segment B (team leads) gets a different body paragraph.
 *
 * @param toEmail   - Recipient email address
 * @param targetId  - UUID of pilot_recruitment_targets row (used for logging)
 * @param data      - Personalization data
 * @returns true if email was sent successfully
 */
export async function sendPilotOutreachEmail(
  toEmail: string,
  targetId: string,
  data: PilotOutreachEmailData
): Promise<boolean> {
  const resend = await getResend()
  if (!resend) {
    logger.error(`[outreach-email] RESEND_API_KEY not configured — cannot send to ${toEmail}`)
    return false
  }

  const { firstName, painPoint, demoLink, isTeamLead } = data

  const subject = `${firstName}, you mentioned this`

  // Segment A (solo agents) vs Segment B (team leads) — content brief copy
  const responseParaA = `LeadFlow responds to incoming leads via SMS in under 30 seconds — while you're in a showing, on the road, or just off the clock. It plugs directly into Follow Up Boss, so your existing pipeline doesn't change. When a lead comes in, LeadFlow greets them, qualifies them, and books a call or showing on your Cal.com calendar. You just show up.`
  const responseParaB = `LeadFlow responds to incoming leads via SMS in under 30 seconds — while your team is in showings, on other calls, or closed for the night. It routes leads to the right agent in your FUB pipeline automatically. When a lead comes in, LeadFlow greets them, qualifies them, and books appointments to the right calendar. Your team just shows up.`
  const responsePara = isTeamLead ? responseParaB : responseParaA

  const painPointLine = painPoint
    ? `I saw your post about lead response — the one where you mentioned ${painPoint}.`
    : `I saw your post about lead response.`

  // Plain HTML — no logo, no banner, personal tone per content brief
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="font-family: Georgia, 'Times New Roman', serif; background: #ffffff; margin: 0; padding: 0; color: #1a1a1a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #ffffff; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width: 560px; width: 100%;">
          <tr>
            <td style="padding: 0 20px;">
              <p style="font-size: 16px; line-height: 1.7; margin: 0 0 16px;">Hi ${firstName},</p>

              <p style="font-size: 16px; line-height: 1.7; margin: 0 0 16px;">${painPointLine}</p>

              <p style="font-size: 16px; line-height: 1.7; margin: 0 0 16px;">That&rsquo;s exactly the problem LeadFlow was built to solve.</p>

              <p style="font-size: 16px; line-height: 1.7; margin: 0 0 16px;">${responsePara}</p>

              <p style="font-size: 16px; line-height: 1.7; margin: 0 0 16px;">I&rsquo;d like to give you free access to run a pilot this month.</p>

              <p style="font-size: 16px; line-height: 1.7; margin: 0 0 24px;">No contract. No pitch call required. If it doesn&rsquo;t improve your response rate in 14 days, you walk away.</p>

              <table cellpadding="0" cellspacing="0" style="margin: 0 0 8px;">
                <tr>
                  <td>
                    <a href="${demoLink}"
                       style="display: inline-block; padding: 14px 28px; background: #16a34a; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
                      Start Your Free Pilot &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 13px; color: #6b7280; margin: 0 0 24px;">Takes 3 minutes to connect. No credit card required.</p>

              <p style="font-size: 16px; line-height: 1.7; margin: 0 0 16px;">This link is just for you &mdash; it takes about 3 minutes to connect your FUB account and go live.</p>

              <p style="font-size: 16px; line-height: 1.7; margin: 0 0 4px;">Stojan</p>
              <p style="font-size: 15px; color: #374151; margin: 0 0 32px;">Founder, LeadFlow AI</p>

              <p style="font-size: 14px; color: #6b7280; margin: 0 0 24px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                P.S. Reply to this email anytime &mdash; this goes directly to me.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  try {
    const { data: emailData, error } = await resend.emails.send({
      from: FROM_DISPLAY,
      to: toEmail,
      subject,
      html,
      click_tracking: false,
    })

    if (error) {
      logger.error(`[outreach-email] Failed to send to ${toEmail}:`, error)
      await logEmailEvent(targetId, toEmail, subject, 'failed', error.message)
      return false
    }

    logger.info(`[outreach-email] Sent to ${toEmail} (resend_id=${emailData?.id})`)
    await logEmailEvent(targetId, toEmail, subject, 'sent', undefined, emailData?.id)
    return true
  } catch (err: any) {
    logger.error(`[outreach-email] Exception sending to ${toEmail}:`, err)
    await logEmailEvent(targetId, toEmail, subject, 'failed', err.message)
    return false
  }
}

async function logEmailEvent(
  targetId: string,
  recipient: string,
  subject: string,
  status: 'sent' | 'failed',
  errorMessage?: string,
  resendId?: string
): Promise<void> {
  try {
    await postgrestAdmin.from('email_events').insert({
      customer_id: targetId,
      email_type: 'pilot_outreach',
      recipient,
      subject,
      status,
      sent_at: status === 'sent' ? new Date().toISOString() : undefined,
      error_message: errorMessage ?? null,
      metadata: resendId ? { resend_id: resendId, source: 'outreach-blast' } : { source: 'outreach-blast' },
    })
  } catch (err) {
    logger.error('[outreach-email] Failed to log email event:', err)
  }
}
