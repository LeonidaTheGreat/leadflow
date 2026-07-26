/**
 * Referral Program Email Notifications
 * Sends transactional emails for referral conversion events.
 */

import { logger } from '@/lib/logger'

const FROM_EMAIL = (process.env.FROM_EMAIL || 'onboarding@landyourleads.com').trim()
const COMPANY_NAME = 'LeadFlow AI'

interface ReferralConversionEmailParams {
  referrerEmail: string
  referrerName: string
  referredEmail: string
  creditApplied: boolean
}

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

export async function sendReferralConversionEmail(params: ReferralConversionEmailParams): Promise<boolean> {
  const { referrerEmail, referrerName, referredEmail, creditApplied } = params

  const resend = await getResend()
  if (!resend) {
    logger.warn('[referral-email] Resend not configured — skipping notification email')
    return false
  }

  const subject = `🎉 Your referral converted — 1 free month applied!`
  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #10b981;">Congratulations, ${referrerName}!</h2>
      <p>
        Your referral (<strong>${referredEmail}</strong>) just completed their first paid month with ${COMPANY_NAME}.
      </p>
      ${
        creditApplied
          ? `<p><strong>✅ Your 1-month credit has been applied to your next invoice.</strong></p>`
          : `<p>We'll apply your 1-month credit to your next invoice shortly.</p>`
      }
      <p style="color: #6b7280; font-size: 14px;">
        Keep sharing your referral link — every conversion earns you another free month!
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 12px;">
        ${COMPANY_NAME} · <a href="https://leadflow-ai-five.vercel.app/settings">Manage referrals</a>
      </p>
    </div>
  `

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: referrerEmail,
      subject,
      html,
    })
    return true
  } catch (err) {
    logger.error('[referral-email] Failed to send conversion email', err)
    return false
  }
}
