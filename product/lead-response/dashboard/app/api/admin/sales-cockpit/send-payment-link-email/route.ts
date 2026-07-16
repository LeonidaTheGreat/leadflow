import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { postgrestAdmin } from '@/lib/db'
import { requireAdmin } from '@/lib/services/AuthService'
import { logger } from '@/lib/logger'

const FROM_EMAIL = (process.env.FROM_EMAIL || 'onboarding@landyourleads.com').trim()
const FROM_DISPLAY = `Stojan from LeadFlow <${FROM_EMAIL}>`
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://leadflow-ai-five.vercel.app').replace(/\/$/, '')

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20' as any })
  : null

function buildEmailHtml(firstName: string, paymentUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="font-family: Georgia, 'Times New Roman', serif; background: #ffffff; margin: 0; padding: 0; color: #1a1a1a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #ffffff; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; padding: 0 24px;">
          <tr>
            <td style="padding-bottom: 32px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.7;">Hi ${firstName || 'there'},</p>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.7;">
                You've finished setting up LeadFlow — congrats on completing onboarding.
              </p>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.7;">
                To keep your leads getting answered in under 30 seconds, here's a direct link to activate your Starter plan ($49/month):
              </p>
              <table cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                <tr>
                  <td style="background: #0f172a; border-radius: 6px;">
                    <a href="${paymentUrl}" style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 15px; font-weight: 600; letter-spacing: 0.01em;">
                      Activate My Account — $49/mo →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.7;">
                The Starter plan includes 100 SMS responses/month and full AI qualification. You can upgrade any time.
              </p>
              <p style="margin: 0 0 8px; font-size: 16px; line-height: 1.7;">Stojan</p>
              <p style="margin: 0; font-size: 14px; color: #6b7280;">LeadFlow AI</p>
            </td>
          </tr>
          <tr>
            <td style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.6;">
                If you didn't create a LeadFlow account, you can ignore this email.
                Questions? Reply to this email or visit <a href="${APP_URL}" style="color: #6b7280;">${APP_URL}</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/**
 * POST /api/admin/sales-cockpit/send-payment-link-email
 * Generates a Starter-tier Stripe payment link and emails it to the agent.
 * Creates price dynamically — no pre-configured price IDs required.
 */
export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { agentId } = body ?? {}

  if (!agentId || typeof agentId !== 'string') {
    return NextResponse.json({ error: 'agentId is required' }, { status: 400 })
  }

  const { data: agent, error: agentError } = await postgrestAdmin
    .from('real_estate_agents')
    .select('id,first_name,email,stripe_customer_id,onboarding_completed')
    .eq('id', agentId)
    .single()

  if (agentError || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  if (!agent.email) {
    return NextResponse.json({ error: 'Agent has no email address' }, { status: 422 })
  }

  try {
    // Create a price on the fly — bypasses missing STRIPE_PRICE_STARTER_MONTHLY env var
    const price = await stripe.prices.create({
      currency: 'usd',
      unit_amount: 4900,
      recurring: { interval: 'month' },
      product_data: { name: 'LeadFlow AI — Starter' },
    })

    const metadata: Record<string, string> = {
      source: 'admin_sales_cockpit_email',
      agent_id: agentId,
      agent_email: agent.email,
      tier: 'starter',
    }
    if (agent.stripe_customer_id) {
      metadata.stripe_customer_id = agent.stripe_customer_id
    }

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
      after_completion: {
        type: 'redirect',
        redirect: { url: `${APP_URL}/dashboard?upgrade=success` },
      },
      metadata,
    })

    const resend = process.env.RESEND_API_KEY ? (() => {
      try {
        const { Resend } = require('resend')
        return new Resend(process.env.RESEND_API_KEY!.trim())
      } catch {
        return null
      }
    })() : null

    if (!resend) {
      return NextResponse.json({
        error: 'Email not configured (RESEND_API_KEY missing)',
        url: paymentLink.url,
      }, { status: 503 })
    }

    const firstName = agent.first_name || ''
    const { error: emailError } = await resend.emails.send({
      from: FROM_DISPLAY,
      to: [agent.email],
      subject: `${firstName ? firstName + ', activate' : 'Activate'} your LeadFlow account — $49/mo`,
      html: buildEmailHtml(firstName, paymentLink.url),
    })

    if (emailError) {
      logger.error('Payment link email send failed:', emailError)
      return NextResponse.json({
        error: 'Payment link created but email failed',
        url: paymentLink.url,
        emailError: String(emailError),
      }, { status: 500 })
    }

    logger.info(`Payment link email sent to ${agent.email} (agent ${agentId})`)

    return NextResponse.json({ success: true, url: paymentLink.url, sentTo: agent.email })
  } catch (error) {
    logger.error('Send payment link email error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
