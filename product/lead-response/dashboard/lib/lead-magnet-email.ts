/**
 * Lead Magnet Email Service
 * UC: feat-lead-magnet-email-capture
 *
 * Handles the 3-email nurture sequence for lead magnet captures.
 * Sequences:
 *   Email 1 (Instant): Playbook delivery
 *   Email 2 (Day 3):   Social proof nudge
 *   Email 3 (Day 7):   Urgency / pilot offer
 */

// Lazy-load Resend to avoid build error when package isn't installed
let _resend: unknown = null
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

// .trim() guards against trailing whitespace/newlines in env var values
const FROM_EMAIL = (process.env.FROM_EMAIL || 'stojan@leadflow.ai').trim()
const SIGNUP_URL = process.env.NEXT_PUBLIC_SIGNUP_URL || 'https://leadflow-ai-five.vercel.app/pilot'
const LANDING_URL = process.env.NEXT_PUBLIC_LANDING_URL || 'https://leadflow-ai-five.vercel.app'

// ─────────────────────────────────────────────────────────────────────────────
// Email 1: Playbook Delivery (Instant)
// ─────────────────────────────────────────────────────────────────────────────
function email1Html(firstName: string): string {
  const name = firstName || 'there'
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Your AI Lead Response Playbook</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.06);">
    <div style="background: #10b981; padding: 32px 40px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">LeadFlow AI</h1>
      <p style="color: #d1fae5; margin: 8px 0 0; font-size: 15px;">Your playbook is ready 🏡</p>
    </div>
    <div style="padding: 40px;">
      <h2 style="color: #1e293b; margin: 0 0 16px;">Hi ${name}, here's your playbook!</h2>
      <p style="color: #475569; line-height: 1.7; margin: 0 0 24px;">
        You asked for <strong>The 5-Minute AI Lead Response Playbook</strong> — and it's ready for you below.
        This is the exact framework top-producing real estate agents use to respond faster and convert more leads.
      </p>
      
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 24px; margin: 0 0 32px;">
        <h3 style="color: #15803d; margin: 0 0 16px; font-size: 18px;">📋 The 5-Minute AI Lead Response Playbook</h3>
        <p style="color: #166534; font-weight: 600; margin: 0 0 12px;">How Top Real Estate Agents Never Miss a Lead</p>
        
        <p style="color: #374151; line-height: 1.7; margin: 0 0 16px;"><strong>Step 1: Respond in under 5 minutes (always)</strong><br>
        Studies show lead conversion drops by 10x if you wait more than 5 minutes to respond. The first agent to respond wins — not the best agent.</p>
        
        <p style="color: #374151; line-height: 1.7; margin: 0 0 16px;"><strong>Step 2: Qualify with 3 key questions</strong><br>
        Don't launch into a sales pitch. Ask: (1) What neighborhoods are you exploring? (2) What's your ideal timeline? (3) Are you working with a lender yet? These answers tell you everything.</p>
        
        <p style="color: #374151; line-height: 1.7; margin: 0 0 16px;"><strong>Step 3: Personalize, don't template</strong><br>
        Generic responses get ignored. Reference their specific inquiry ("I saw you were interested in 3-bed homes in Oakville") — even small personalization doubles engagement.</p>
        
        <p style="color: #374151; line-height: 1.7; margin: 0 0 16px;"><strong>Step 4: Offer immediate value</strong><br>
        Before asking for a showing, offer something free: a market report, a neighborhood guide, or a quick call. Leads who receive value first are 3x more likely to book.</p>
        
        <p style="color: #374151; line-height: 1.7; margin: 0;"><strong>Step 5: Follow up (but don't stalk)</strong><br>
        A 7-touch sequence over 14 days converts 60% of leads that don't respond initially. Day 1 → Day 3 → Day 5 → Day 7 → Day 10 → Day 12 → Day 14. Then monthly.</p>
      </div>
      
      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin: 0 0 32px;">
        <p style="color: #1e40af; margin: 0; font-size: 14px; line-height: 1.6;">
          <strong>💡 The honest part:</strong> Following this playbook manually takes 2–3 hours per day. 
          That's why we built LeadFlow — it handles Steps 1–4 automatically in under 30 seconds, 24/7.
        </p>
      </div>
      
      <div style="text-align: center;">
        <a href="${SIGNUP_URL}" style="display: inline-block; padding: 16px 32px; background: #10b981; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px;">
          Try LeadFlow Free →
        </a>
        <p style="color: #94a3b8; font-size: 12px; margin: 12px 0 0;">Free pilot. No credit card required.</p>
      </div>
    </div>
    <div style="padding: 24px 40px; border-top: 1px solid #f1f5f9; text-align: center;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
        You received this because you requested our playbook at <a href="${LANDING_URL}" style="color: #10b981;">leadflow.ai</a>.<br>
        <a href="${LANDING_URL}/unsubscribe" style="color: #94a3b8;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>`
}

// ─────────────────────────────────────────────────────────────────────────────
// Email 2: Social Proof Nudge (Day 3)
// ─────────────────────────────────────────────────────────────────────────────
function email2Html(firstName: string): string {
  const name = firstName || 'there'
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>5 minutes vs. 5 hours</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.06);">
    <div style="background: #1e293b; padding: 32px 40px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">LeadFlow AI</h1>
    </div>
    <div style="padding: 40px;">
      <h2 style="color: #1e293b; margin: 0 0 16px;">Hi ${name} — a quick story about timing</h2>
      
      <p style="color: #475569; line-height: 1.7; margin: 0 0 20px;">
        Meet Sarah. She's a real estate agent in Mississauga with 8 years of experience. 
        She was getting about 40 online leads a month — but only closing 2 or 3 of them.
      </p>
      
      <p style="color: #475569; line-height: 1.7; margin: 0 0 20px;">
        She knew her follow-up process was the problem. Leads would come in at 10pm, 
        she'd see them the next morning, respond by 9am... and by then, 
        the lead had already booked with someone else.
      </p>
      
      <div style="border-left: 4px solid #ef4444; padding: 16px 20px; margin: 0 0 24px; background: #fef2f2; border-radius: 0 8px 8px 0;">
        <p style="color: #991b1b; margin: 0; font-weight: 600;">The hard truth:</p>
        <p style="color: #7f1d1d; margin: 8px 0 0; line-height: 1.7;">
          MIT found that leads called within 5 minutes are <strong>9x more likely to convert</strong> 
          than leads called after 10 minutes. After an hour? You're basically starting cold.
        </p>
      </div>
      
      <p style="color: #475569; line-height: 1.7; margin: 0 0 20px;">
        Sarah joined our pilot 3 weeks ago. LeadFlow now responds to every lead via SMS 
        within 30 seconds — day, night, weekend. It qualifies them, answers basic questions, 
        and books appointments.
      </p>
      
      <p style="color: #475569; line-height: 1.7; margin: 0 0 32px;">
        Her close rate on online leads went from ~6% to ~18% in the first two weeks.
      </p>
      
      <div style="text-align: center; margin: 0 0 32px;">
        <a href="${LANDING_URL}" style="display: inline-block; padding: 16px 32px; background: #10b981; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px;">
          See How LeadFlow Works →
        </a>
      </div>
      
      <p style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 0;">
        — Stojan, founder of LeadFlow AI
      </p>
    </div>
    <div style="padding: 24px 40px; border-top: 1px solid #f1f5f9; text-align: center;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
        LeadFlow AI · <a href="${LANDING_URL}/unsubscribe" style="color: #94a3b8;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>`
}

// ─────────────────────────────────────────────────────────────────────────────
// Email 3: Urgency / Pilot Offer (Day 7)
// ─────────────────────────────────────────────────────────────────────────────
function email3Html(firstName: string): string {
  const name = firstName || 'there'
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Pilot spots are almost full</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.06);">
    <div style="background: #10b981; padding: 32px 40px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">LeadFlow AI</h1>
      <p style="color: #d1fae5; margin: 8px 0 0; font-size: 15px;">Last few pilot spots remaining</p>
    </div>
    <div style="padding: 40px;">
      <h2 style="color: #1e293b; margin: 0 0 16px;">Hi ${name}, I wanted to reach out personally</h2>
      
      <p style="color: #475569; line-height: 1.7; margin: 0 0 20px;">
        You grabbed our playbook a week ago, and I've been meaning to follow up directly.
      </p>
      
      <p style="color: #475569; line-height: 1.7; margin: 0 0 20px;">
        We're running a <strong>free pilot program</strong> for real estate agents — 
        and we're filling the last few spots now. 
        Here's what's included at no cost:
      </p>
      
      <ul style="color: #374151; line-height: 2; margin: 0 0 24px; padding-left: 20px;">
        <li>AI-powered SMS lead response in &lt;30 seconds</li>
        <li>Lead qualification (budget, timeline, intent)</li>
        <li>Cal.com appointment booking — fully automated</li>
        <li>Follow Up Boss integration</li>
        <li>Full analytics dashboard</li>
        <li>60 days free — no credit card, no commitment</li>
      </ul>
      
      <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 20px; margin: 0 0 32px;">
        <p style="color: #92400e; margin: 0; font-size: 14px; line-height: 1.7;">
          <strong>⏰ Why limited spots?</strong> We're a small team and we personally onboard 
          every pilot agent to make sure the AI is calibrated to their market and style. 
          We can't do that with 100 people at once — so we cap it at 5 at a time.
        </p>
      </div>
      
      <div style="text-align: center; margin: 0 0 32px;">
        <a href="${SIGNUP_URL}" style="display: inline-block; padding: 18px 40px; background: #10b981; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 18px;">
          Claim Your Free Pilot Spot →
        </a>
        <p style="color: #94a3b8; font-size: 12px; margin: 12px 0 0;">Takes 3 minutes to set up. Cancel anytime.</p>
      </div>
      
      <p style="color: #475569; line-height: 1.7; margin: 0 0 8px;">
        If you have questions, just reply to this email — I read every one.
      </p>
      
      <p style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 0;">
        — Stojan, founder of LeadFlow AI
      </p>
    </div>
    <div style="padding: 24px 40px; border-top: 1px solid #f1f5f9; text-align: center;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
        LeadFlow AI · <a href="${LANDING_URL}/unsubscribe" style="color: #94a3b8;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>`
}

// ─────────────────────────────────────────────────────────────────────────────
// Send functions
// ─────────────────────────────────────────────────────────────────────────────

export interface LeadMagnetEmailResult {
  sent: boolean
  provider: 'resend' | 'logged'
  error?: string
}

/**
 * Send Email 1: Playbook delivery (called immediately on capture)
 */
export async function sendPlaybookEmail(
  email: string,
  firstName?: string
): Promise<LeadMagnetEmailResult> {
  const subject = "Your AI Lead Response Playbook is here 🏡"
  const html = email1Html(firstName || '')

  return sendLeadMagnetEmail(email, subject, html, 'lead_magnet_email_1')
}

/**
 * Send Email 2: Social proof nudge (Day 3 — called by cron/scheduler)
 */
export async function sendSocialProofEmail(
  email: string,
  firstName?: string
): Promise<LeadMagnetEmailResult> {
  const subject = "What happens when you respond to a lead in 5 minutes vs. 5 hours"
  const html = email2Html(firstName || '')

  return sendLeadMagnetEmail(email, subject, html, 'lead_magnet_email_2')
}

/**
 * Send Email 3: Urgency / pilot offer (Day 7 — called by cron/scheduler)
 */
export async function sendPilotOfferEmail(
  email: string,
  firstName?: string
): Promise<LeadMagnetEmailResult> {
  const subject = "Pilot spots are almost full — here's your invite"
  const html = email3Html(firstName || '')

  return sendLeadMagnetEmail(email, subject, html, 'lead_magnet_email_3')
}

/**
 * Internal: send via Resend or log if not configured
 */
async function sendLeadMagnetEmail(
  to: string,
  subject: string,
  html: string,
  emailType: string
): Promise<LeadMagnetEmailResult> {
  const resend = await getResend() as {
    emails: { send: (opts: unknown) => Promise<{ data: unknown; error: { message: string } | null }> }
  } | null

  if (!resend) {
    console.log(`📧 [lead-magnet] Email queued (Resend not configured): ${emailType} to ${to}`)
    return { sent: false, provider: 'logged' }
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    })

    if (error) {
      console.error(`❌ [lead-magnet] Failed to send ${emailType} to ${to}:`, error)
      return { sent: false, provider: 'resend', error: error.message }
    }

    console.log(`✅ [lead-magnet] Sent ${emailType} to ${to}`)
    return { sent: true, provider: 'resend' }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`❌ [lead-magnet] Error sending ${emailType}:`, message)
    return { sent: false, provider: 'resend', error: message }
  }
}
