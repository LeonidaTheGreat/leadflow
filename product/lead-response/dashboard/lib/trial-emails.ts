import { supabaseAdmin } from '@/lib/db'
import { Resend } from 'resend'
import { logger } from '@/lib/logger'

const supabase = supabaseAdmin
// Lazy init — Resend throws if API key is missing at import time, which crashes Next.js build in CI
let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-five.vercel.app'
const FROM_EMAIL = (process.env.FROM_EMAIL || 'onboarding@leadflow.ai').trim()
const FROM_DISPLAY = `LeadFlow AI <${FROM_EMAIL}>`

interface TrialAgent {
  id: string
  email: string
  first_name: string
  last_name?: string
  created_at: string
  trial_email_welcome_sent: boolean
  trial_email_day1_aha_sent: boolean
  trial_email_day3_upgrade_sent: boolean
  trial_email_day7_warning_sent: boolean
  trial_email_day14_expired_sent: boolean
  trial_email_day15_final_sent: boolean
  aha_completed?: boolean
}

interface EmailResult {
  type: 'welcome' | 'day1_aha' | 'day3_upgrade' | 'day7_warning' | 'day14_expired' | 'day15_final'
  count: number
  success: number
  failed: number
  errors: string[]
}

/**
 * Calculate days since signup
 */
function getDaysSinceSignup(createdAt: string): number {
  const now = new Date()
  const signupAt = new Date(createdAt)
  const diffMs = now.getTime() - signupAt.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Get all trial agents eligible for emails
 */
async function getTrialAgents(): Promise<TrialAgent[]> {
  const { data, error } = await supabase
    .from('real_estate_agents')
    .select('id, email, first_name, last_name, created_at, trial_email_welcome_sent, trial_email_day1_aha_sent, trial_email_day3_upgrade_sent, trial_email_day7_warning_sent, trial_email_day14_expired_sent, trial_email_day15_final_sent, aha_completed')
    .eq('plan_tier', 'trial')
    .eq('email_verified', true)

  if (error) {
    logger.error('Error fetching trial agents', error)
    return []
  }

  return data || []
}

/**
 * Send welcome email (Day 0)
 */
async function sendWelcomeEmail(agent: TrialAgent): Promise<{ success: boolean; error?: string }> {
  try {
    const agentName = agent.first_name || 'there'

    const { error } = await getResend().emails.send({
      from: FROM_DISPLAY,
      to: agent.email,
      subject: 'Welcome to LeadFlow AI — your first lead response in 30 seconds',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1f2937; margin-bottom: 16px;">Welcome to LeadFlow AI</h2>
          
          <p style="color: #4b5563; margin-bottom: 16px;">Hi ${agentName},</p>
          
          <p style="color: #4b5563; margin-bottom: 16px;">
            Welcome to LeadFlow AI. Here's what happens next:
          </p>
          
          <ol style="color: #4b5563; margin-bottom: 24px; padding-left: 20px;">
            <li style="margin-bottom: 8px;">Connect your Follow Up Boss account (takes 2 minutes)</li>
            <li style="margin-bottom: 8px;">The next lead that comes in gets an AI response in under 30 seconds</li>
            <li>You'll see it happen live in your dashboard</li>
          </ol>
          
          <p style="color: #4b5563; margin-bottom: 24px;">
            That's it. No scripts to write. No templates to configure.
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${APP_URL}/dashboard/onboarding" style="display: inline-block; background-color: #10b981; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600;">
              Set Up Your Account →
            </a>
          </div>
          
          <p style="color: #6b7280; margin-bottom: 24px;">
            You have 14 days free. No credit card needed until you decide to continue.
          </p>
          
          <p style="color: #9ca3af; margin-top: 32px; font-size: 14px;">— The LeadFlow Team</p>
        </div>
      `
    })

    if (error) {
      logger.error(`Failed to send welcome email to ${agent.email}`, error)
      return { success: false, error: error.message }
    }

    // Mark email as sent
    const { error: updateError } = await supabase
      .from('real_estate_agents')
      .update({ trial_email_welcome_sent: true })
      .eq('id', agent.id)

    if (updateError) {
      logger.error(`Failed to mark welcome email as sent for ${agent.id}`, updateError)
    }

    // Log the email send
    await supabase.from('trial_email_logs').insert({
      agent_id: agent.id,
      email_type: 'trial_welcome',
      email_address: agent.email,
      delivery_status: 'sent'
    })

    return { success: true }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    logger.error(`Welcome email error for ${agent.email}`, error)
    return { success: false, error }
  }
}

/**
 * Send Day 1 AI Aha email
 */
async function sendDay1AhaEmail(agent: TrialAgent): Promise<{ success: boolean; error?: string }> {
  try {
    const agentName = agent.first_name || 'there'

    const { error } = await getResend().emails.send({
      from: FROM_DISPLAY,
      to: agent.email,
      subject: 'This is what your leads experience when you use LeadFlow',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1f2937; margin-bottom: 16px;">This is what your leads experience</h2>
          
          <p style="color: #4b5563; margin-bottom: 16px;">Hi ${agentName},</p>
          
          <p style="color: #4b5563; margin-bottom: 16px;">
            Want to see exactly what your leads get when they inquire?
          </p>
          
          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #10b981;">
            <p style="color: #374151; margin: 0; font-style: italic;">
              "Hi Sarah! Thanks for your interest in 123 Main St. I'd love to schedule a quick call — are you available tomorrow?"
            </p>
          </div>
          
          <p style="color: #4b5563; margin-bottom: 16px;">
            That's not a template. That's AI reading the lead, reading your listings, and writing something real.
          </p>
          
          <p style="color: #4b5563; margin-bottom: 24px;">
            <strong>79% of leads go to the first agent who responds.</strong> LeadFlow makes you that agent — even while you sleep.
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${APP_URL}/dashboard/demo" style="display: inline-block; background-color: #10b981; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600;">
              See It In Action →
            </a>
          </div>
          
          <p style="color: #9ca3af; margin-top: 32px; font-size: 14px;">— The LeadFlow Team</p>
        </div>
      `
    })

    if (error) {
      logger.error(`Failed to send day 1 aha email to ${agent.email}`, error)
      return { success: false, error: error.message }
    }

    // Mark email as sent
    const { error: updateError } = await supabase
      .from('real_estate_agents')
      .update({ trial_email_day1_aha_sent: true })
      .eq('id', agent.id)

    if (updateError) {
      logger.error(`Failed to mark day 1 aha email as sent for ${agent.id}`, updateError)
    }

    // Log the email send
    await supabase.from('trial_email_logs').insert({
      agent_id: agent.id,
      email_type: 'trial_day1_aha',
      email_address: agent.email,
      delivery_status: 'sent'
    })

    return { success: true }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    logger.error(`Day 1 aha email error for ${agent.email}`, error)
    return { success: false, error }
  }
}

/**
 * Send Day 3 Upgrade Nudge email
 */
async function sendDay3UpgradeEmail(agent: TrialAgent): Promise<{ success: boolean; error?: string }> {
  try {
    const agentName = agent.first_name || 'there'

    const { error } = await getResend().emails.send({
      from: FROM_DISPLAY,
      to: agent.email,
      subject: '3 days in — how many leads have you responded to?',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1f2937; margin-bottom: 16px;">3 days in — how many leads have you responded to?</h2>
          
          <p style="color: #4b5563; margin-bottom: 16px;">Hi ${agentName},</p>
          
          <p style="color: #4b5563; margin-bottom: 16px;">
            Three days in. In that time, LeadFlow agents on Pro have responded to an average of 12 leads. Every response went out in under 30 seconds. Every lead got a follow-up.
          </p>
          
          <p style="color: #4b5563; margin-bottom: 16px;">
            If you haven't set up your FUB integration yet, today's the day. It takes 2 minutes and you'll start seeing results immediately.
          </p>
          
          <p style="color: #4b5563; margin-bottom: 24px;">
            When your trial ends in 11 days, Pro keeps everything running at <strong>$149/month</strong>. That's less than one lost lead.
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${APP_URL}/dashboard/upgrade?plan=pro" style="display: inline-block; background-color: #10b981; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600;">
              Upgrade to Pro — $149/mo →
            </a>
          </div>
          
          <p style="color: #9ca3af; margin-top: 32px; font-size: 14px;">— The LeadFlow Team</p>
        </div>
      `
    })

    if (error) {
      logger.error(`Failed to send day 3 upgrade email to ${agent.email}`, error)
      return { success: false, error: error.message }
    }

    // Mark email as sent
    const { error: updateError } = await supabase
      .from('real_estate_agents')
      .update({ trial_email_day3_upgrade_sent: true })
      .eq('id', agent.id)

    if (updateError) {
      logger.error(`Failed to mark day 3 upgrade email as sent for ${agent.id}`, updateError)
    }

    // Log the email send
    await supabase.from('trial_email_logs').insert({
      agent_id: agent.id,
      email_type: 'trial_day3_upgrade',
      email_address: agent.email,
      delivery_status: 'sent'
    })

    return { success: true }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    logger.error(`Day 3 upgrade email error for ${agent.email}`, error)
    return { success: false, error }
  }
}

/**
 * Send Day 7 Warning email
 */
async function sendDay7WarningEmail(agent: TrialAgent): Promise<{ success: boolean; error?: string }> {
  try {
    const agentName = agent.first_name || 'there'

    const { error } = await getResend().emails.send({
      from: FROM_DISPLAY,
      to: agent.email,
      subject: '7 days left — don\'t lose your leads',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1f2937; margin-bottom: 16px;">7 days left — don't lose your leads</h2>
          
          <p style="color: #4b5563; margin-bottom: 16px;">Hi ${agentName},</p>
          
          <p style="color: #4b5563; margin-bottom: 16px;">
            You're halfway through your trial. 7 days left.
          </p>
          
          <p style="color: #4b5563; margin-bottom: 16px;">
            When the trial ends, LeadFlow stops responding to your leads. Every new inquiry gets silence — and <strong>78% of those leads go to another agent within the hour.</strong>
          </p>
          
          <p style="color: #4b5563; margin-bottom: 24px;">
            Keep the momentum going. Pro is $149/month and you can cancel anytime.
          </p>
          
          <p style="color: #4b5563; margin-bottom: 24px;">
            Don't let 7 days of setup go to waste.
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${APP_URL}/dashboard/upgrade?plan=pro" style="display: inline-block; background-color: #f59e0b; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600;">
              Keep My Leads →
            </a>
          </div>
          
          <p style="color: #9ca3af; margin-top: 32px; font-size: 14px;">— The LeadFlow Team</p>
        </div>
      `
    })

    if (error) {
      logger.error(`Failed to send day 7 warning email to ${agent.email}`, error)
      return { success: false, error: error.message }
    }

    // Mark email as sent
    const { error: updateError } = await supabase
      .from('real_estate_agents')
      .update({ trial_email_day7_warning_sent: true })
      .eq('id', agent.id)

    if (updateError) {
      logger.error(`Failed to mark day 7 warning email as sent for ${agent.id}`, updateError)
    }

    // Log the email send
    await supabase.from('trial_email_logs').insert({
      agent_id: agent.id,
      email_type: 'trial_day7_warning',
      email_address: agent.email,
      delivery_status: 'sent'
    })

    return { success: true }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    logger.error(`Day 7 warning email error for ${agent.email}`, error)
    return { success: false, error }
  }
}

/**
 * Send Day 14 Expired email
 */
async function sendDay14ExpiredEmail(agent: TrialAgent): Promise<{ success: boolean; error?: string }> {
  try {
    const agentName = agent.first_name || 'there'

    const { error } = await getResend().emails.send({
      from: FROM_DISPLAY,
      to: agent.email,
      subject: 'Your LeadFlow trial has ended — leads are going unanswered',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1f2937; margin-bottom: 16px;">Your LeadFlow trial has ended</h2>
          
          <p style="color: #4b5563; margin-bottom: 16px;">Hi ${agentName},</p>
          
          <p style="color: #4b5563; margin-bottom: 16px;">
            Your 14-day LeadFlow AI trial has ended.
          </p>
          
          <p style="color: #4b5563; margin-bottom: 16px;">
            Your leads are no longer being responded to automatically.
          </p>
          
          <p style="color: #4b5563; margin-bottom: 24px;">
            The good news: all your settings, integrations, and history are saved. You can pick up exactly where you left off — just upgrade to Pro.
          </p>
          
          <p style="color: #4b5563; margin-bottom: 24px;">
            <strong>$149/month. Cancel anytime.</strong> Start converting leads again today.
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${APP_URL}/dashboard/upgrade?plan=pro" style="display: inline-block; background-color: #10b981; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600;">
              Reactivate Now →
            </a>
          </div>
          
          <p style="color: #9ca3af; margin-top: 32px; font-size: 14px;">— The LeadFlow Team</p>
        </div>
      `
    })

    if (error) {
      logger.error(`Failed to send day 14 expired email to ${agent.email}`, error)
      return { success: false, error: error.message }
    }

    // Mark email as sent
    const { error: updateError } = await supabase
      .from('real_estate_agents')
      .update({ trial_email_day14_expired_sent: true })
      .eq('id', agent.id)

    if (updateError) {
      logger.error(`Failed to mark day 14 expired email as sent for ${agent.id}`, updateError)
    }

    // Log the email send
    await supabase.from('trial_email_logs').insert({
      agent_id: agent.id,
      email_type: 'trial_day14_expired',
      email_address: agent.email,
      delivery_status: 'sent'
    })

    return { success: true }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    logger.error(`Day 14 expired email error for ${agent.email}`, error)
    return { success: false, error }
  }
}

/**
 * Send Day 15 Final Chance email
 */
async function sendDay15FinalEmail(agent: TrialAgent): Promise<{ success: boolean; error?: string }> {
  try {
    const agentName = agent.first_name || 'there'

    const { error } = await getResend().emails.send({
      from: FROM_DISPLAY,
      to: agent.email,
      subject: `${agentName}, this is the last email from LeadFlow`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1f2937; margin-bottom: 16px;">This is the last email we'll send</h2>
          
          <p style="color: #4b5563; margin-bottom: 16px;">Hi ${agentName},</p>
          
          <p style="color: #4b5563; margin-bottom: 16px;">
            I don't want to spam you. This is the last email we'll send.
          </p>
          
          <p style="color: #4b5563; margin-bottom: 16px;">
            If LeadFlow wasn't the right fit, no hard feelings. Real estate tech has to earn its place.
          </p>
          
          <p style="color: #4b5563; margin-bottom: 16px;">
            But if you saw the potential — if you know that responding faster to leads would close more deals — the door is still open. Pro is $149/month and you can cancel anytime.
          </p>
          
          <p style="color: #4b5563; margin-bottom: 24px;">
            If you upgrade in the next 24 hours, I'll personally make sure your onboarding is complete and your first lead response is set up correctly.
          </p>
          
          <p style="color: #6b7280; margin-bottom: 24px;">
            — Stojan, LeadFlow
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${APP_URL}/dashboard/upgrade?plan=pro&discount=pilot15" style="display: inline-block; background-color: #10b981; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600;">
              One Last Chance: Upgrade →
            </a>
          </div>
          
          <p style="color: #9ca3af; margin-top: 32px; font-size: 14px;">— The LeadFlow Team</p>
        </div>
      `
    })

    if (error) {
      logger.error(`Failed to send day 15 final email to ${agent.email}`, error)
      return { success: false, error: error.message }
    }

    // Mark email as sent
    const { error: updateError } = await supabase
      .from('real_estate_agents')
      .update({ trial_email_day15_final_sent: true })
      .eq('id', agent.id)

    if (updateError) {
      logger.error(`Failed to mark day 15 final email as sent for ${agent.id}`, updateError)
    }

    // Log the email send
    await supabase.from('trial_email_logs').insert({
      agent_id: agent.id,
      email_type: 'trial_day15_final',
      email_address: agent.email,
      delivery_status: 'sent'
    })

    return { success: true }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    logger.error(`Day 15 final email error for ${agent.email}`, error)
    return { success: false, error }
  }
}

/**
 * Main function to send the active trial sequence emails
 * Called by cron job daily
 * 
 * Email schedule (days since signup):
 * - Day 0: Welcome
 * - Day 1: AI Aha
 * - Day 3: Upgrade Nudge
 * - Day 7: Warning
 * - Day 14: Expired
 * - Day 15: Final Chance
 */
export async function sendActiveTrialSequence(): Promise<EmailResult[]> {
  const results: EmailResult[] = []

  try {
    logger.info('Running active trial email sequence...')

    const agents = await getTrialAgents()
    logger.info(`Found ${agents.length} trial agents to process`)

    if (agents.length === 0) {
      return results
    }

    // Categorize agents by which email they need
    const welcomeAgents: TrialAgent[] = []
    const day1AhaAgents: TrialAgent[] = []
    const day3UpgradeAgents: TrialAgent[] = []
    const day7WarningAgents: TrialAgent[] = []
    const day14ExpiredAgents: TrialAgent[] = []
    const day15FinalAgents: TrialAgent[] = []

    for (const agent of agents) {
      const daysSinceSignup = getDaysSinceSignup(agent.created_at)

      // Day 0: Welcome
      if (daysSinceSignup === 0 && !agent.trial_email_welcome_sent) {
        welcomeAgents.push(agent)
      }
      // Day 1: AI Aha
      else if (daysSinceSignup === 1 && !agent.trial_email_day1_aha_sent) {
        day1AhaAgents.push(agent)
      }
      // Day 3: Upgrade Nudge
      // Only send day-3 email to agents without completed onboarding_simulation (aha_completed = false)
      else if (daysSinceSignup === 3 && !agent.trial_email_day3_upgrade_sent && !agent.aha_completed) {
        day3UpgradeAgents.push(agent)
      }
      // Day 7: Warning
      else if (daysSinceSignup === 7 && !agent.trial_email_day7_warning_sent) {
        day7WarningAgents.push(agent)
      }
      // Day 14: Expired
      else if (daysSinceSignup >= 14 && !agent.trial_email_day14_expired_sent) {
        day14ExpiredAgents.push(agent)
      }
      // Day 15: Final Chance
      else if (daysSinceSignup >= 15 && !agent.trial_email_day15_final_sent) {
        day15FinalAgents.push(agent)
      }
    }

    // Send Welcome emails (Day 0)
    if (welcomeAgents.length > 0) {
      logger.info(`Sending welcome emails to ${welcomeAgents.length} agents...`)
      let success = 0
      let failed = 0
      const errors: string[] = []

      for (const agent of welcomeAgents) {
        const result = await sendWelcomeEmail(agent)
        if (result.success) {
          success++
        } else {
          failed++
          if (result.error) errors.push(`${agent.email}: ${result.error}`)
        }
      }

      results.push({
        type: 'welcome',
        count: welcomeAgents.length,
        success,
        failed,
        errors
      })
      logger.info(`Welcome: ${success}/${welcomeAgents.length} emails sent`)
    }

    // Send Day 1 Aha emails
    if (day1AhaAgents.length > 0) {
      logger.info(`Sending day 1 aha emails to ${day1AhaAgents.length} agents...`)
      let success = 0
      let failed = 0
      const errors: string[] = []

      for (const agent of day1AhaAgents) {
        const result = await sendDay1AhaEmail(agent)
        if (result.success) {
          success++
        } else {
          failed++
          if (result.error) errors.push(`${agent.email}: ${result.error}`)
        }
      }

      results.push({
        type: 'day1_aha',
        count: day1AhaAgents.length,
        success,
        failed,
        errors
      })
      logger.info(`Day 1 Aha: ${success}/${day1AhaAgents.length} emails sent`)
    }

    // Send Day 3 Upgrade emails
    if (day3UpgradeAgents.length > 0) {
      logger.info(`Sending day 3 upgrade emails to ${day3UpgradeAgents.length} agents...`)
      let success = 0
      let failed = 0
      const errors: string[] = []

      for (const agent of day3UpgradeAgents) {
        const result = await sendDay3UpgradeEmail(agent)
        if (result.success) {
          success++
        } else {
          failed++
          if (result.error) errors.push(`${agent.email}: ${result.error}`)
        }
      }

      results.push({
        type: 'day3_upgrade',
        count: day3UpgradeAgents.length,
        success,
        failed,
        errors
      })
      logger.info(`Day 3 Upgrade: ${success}/${day3UpgradeAgents.length} emails sent`)
    }

    // Send Day 7 Warning emails
    if (day7WarningAgents.length > 0) {
      logger.info(`Sending day 7 warning emails to ${day7WarningAgents.length} agents...`)
      let success = 0
      let failed = 0
      const errors: string[] = []

      for (const agent of day7WarningAgents) {
        const result = await sendDay7WarningEmail(agent)
        if (result.success) {
          success++
        } else {
          failed++
          if (result.error) errors.push(`${agent.email}: ${result.error}`)
        }
      }

      results.push({
        type: 'day7_warning',
        count: day7WarningAgents.length,
        success,
        failed,
        errors
      })
      logger.info(`Day 7 Warning: ${success}/${day7WarningAgents.length} emails sent`)
    }

    // Send Day 14 Expired emails
    if (day14ExpiredAgents.length > 0) {
      logger.info(`Sending day 14 expired emails to ${day14ExpiredAgents.length} agents...`)
      let success = 0
      let failed = 0
      const errors: string[] = []

      for (const agent of day14ExpiredAgents) {
        const result = await sendDay14ExpiredEmail(agent)
        if (result.success) {
          success++
        } else {
          failed++
          if (result.error) errors.push(`${agent.email}: ${result.error}`)
        }
      }

      results.push({
        type: 'day14_expired',
        count: day14ExpiredAgents.length,
        success,
        failed,
        errors
      })
      logger.info(`Day 14 Expired: ${success}/${day14ExpiredAgents.length} emails sent`)
    }

    // Send Day 15 Final emails
    if (day15FinalAgents.length > 0) {
      logger.info(`Sending day 15 final emails to ${day15FinalAgents.length} agents...`)
      let success = 0
      let failed = 0
      const errors: string[] = []

      for (const agent of day15FinalAgents) {
        const result = await sendDay15FinalEmail(agent)
        if (result.success) {
          success++
        } else {
          failed++
          if (result.error) errors.push(`${agent.email}: ${result.error}`)
        }
      }

      results.push({
        type: 'day15_final',
        count: day15FinalAgents.length,
        success,
        failed,
        errors
      })
      logger.info(`Day 15 Final: ${success}/${day15FinalAgents.length} emails sent`)
    }

    return results
  } catch (error) {
    logger.error('Error in sendActiveTrialSequence', error)
    throw error
  }
}

/**
 * Send welcome email immediately at signup
 * Called from trial-signup route
 */
export async function sendTrialWelcomeEmail(agentId: string, email: string, firstName: string): Promise<boolean> {
  try {
    const agent: TrialAgent = {
      id: agentId,
      email,
      first_name: firstName,
      created_at: new Date().toISOString(),
      trial_email_welcome_sent: false,
      trial_email_day1_aha_sent: false,
      trial_email_day3_upgrade_sent: false,
      trial_email_day7_warning_sent: false,
      trial_email_day14_expired_sent: false,
      trial_email_day15_final_sent: false
    }

    const result = await sendWelcomeEmail(agent)
    return result.success
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    logger.error(`Failed to send trial welcome email for ${agentId}`, error)
    return false
  }
}

// Keep old function name for backward compatibility during transition
export async function sendTrialReminderEmails(): Promise<EmailResult[]> {
  logger.warn('sendTrialReminderEmails is deprecated, use sendActiveTrialSequence instead')
  return sendActiveTrialSequence()
}
