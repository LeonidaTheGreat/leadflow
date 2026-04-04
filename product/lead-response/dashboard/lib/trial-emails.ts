import { supabaseAdmin } from '@/lib/db'
import { Resend } from 'resend'

const supabase = supabaseAdmin
// Lazy init — Resend throws if API key is missing at import time, which crashes Next.js build in CI
let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-five.vercel.app'

interface TrialAgent {
  id: string
  email: string
  first_name: string
  last_name?: string
  trial_ends_at: string
  created_at: string
  trial_email_day6_sent: boolean
  trial_email_day3_sent: boolean
  trial_email_day1_sent: boolean
  trial_email_expired_sent: boolean
}

interface EmailResult {
  type: 'day6' | 'day3' | 'day1' | 'expired'
  count: number
  success: number
  failed: number
  errors: string[]
}

/**
 * Calculate days remaining until trial expires
 */
function getDaysRemaining(trialEndsAt: string): number {
  const now = new Date()
  const expiresAt = new Date(trialEndsAt)
  const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, daysRemaining)
}

/**
 * Get agents eligible for trial day 6 email (6 days remaining)
 */
async function getDay6Eligible(): Promise<TrialAgent[]> {
  const { data, error } = await supabase
    .from('real_estate_agents')
    .select('id, email, first_name, last_name, trial_ends_at, created_at, trial_email_day6_sent, trial_email_day3_sent, trial_email_day1_sent, trial_email_expired_sent')
    .eq('subscription_status', 'trial')
    .eq('trial_email_day6_sent', false)
    .not('trial_ends_at', 'is', null)

  if (error) {
    console.error('Error fetching day 6 agents:', error)
    return []
  }

  // Filter to agents with exactly 6 days remaining
  return data.filter(agent => {
    const daysRemaining = getDaysRemaining(agent.trial_ends_at)
    return daysRemaining === 6
  })
}

/**
 * Get agents eligible for trial day 3 email (3 days remaining)
 */
async function getDay3Eligible(): Promise<TrialAgent[]> {
  const { data, error } = await supabase
    .from('real_estate_agents')
    .select('id, email, first_name, last_name, trial_ends_at, created_at, trial_email_day6_sent, trial_email_day3_sent, trial_email_day1_sent, trial_email_expired_sent')
    .eq('subscription_status', 'trial')
    .eq('trial_email_day3_sent', false)
    .not('trial_ends_at', 'is', null)

  if (error) {
    console.error('Error fetching day 3 agents:', error)
    return []
  }

  // Filter to agents with exactly 3 days remaining
  return data.filter(agent => {
    const daysRemaining = getDaysRemaining(agent.trial_ends_at)
    return daysRemaining === 3
  })
}

/**
 * Get agents eligible for trial day 1 email (1 day remaining)
 */
async function getDay1Eligible(): Promise<TrialAgent[]> {
  const { data, error } = await supabase
    .from('real_estate_agents')
    .select('id, email, first_name, last_name, trial_ends_at, created_at, trial_email_day6_sent, trial_email_day3_sent, trial_email_day1_sent, trial_email_expired_sent')
    .eq('subscription_status', 'trial')
    .eq('trial_email_day1_sent', false)
    .not('trial_ends_at', 'is', null)

  if (error) {
    console.error('Error fetching day 1 agents:', error)
    return []
  }

  // Filter to agents with exactly 1 day remaining
  return data.filter(agent => {
    const daysRemaining = getDaysRemaining(agent.trial_ends_at)
    return daysRemaining === 1
  })
}

/**
 * Get agents eligible for trial expired email
 */
async function getExpiredEligible(): Promise<TrialAgent[]> {
  const { data, error } = await supabase
    .from('real_estate_agents')
    .select('id, email, first_name, last_name, trial_ends_at, created_at, trial_email_day6_sent, trial_email_day3_sent, trial_email_day1_sent, trial_email_expired_sent')
    .eq('subscription_status', 'trial')
    .eq('trial_email_expired_sent', false)
    .not('trial_ends_at', 'is', null)

  if (error) {
    console.error('Error fetching expired agents:', error)
    return []
  }

  // Filter to agents with 0 or fewer days remaining
  return data.filter(agent => {
    const daysRemaining = getDaysRemaining(agent.trial_ends_at)
    return daysRemaining <= 0
  })
}

/**
 * Send day 6 reminder email
 */
async function sendDay6Email(agent: TrialAgent): Promise<{ success: boolean; error?: string }> {
  try {
    const agentName = agent.first_name || 'there'
    const daysRemaining = getDaysRemaining(agent.trial_ends_at)

    const { error } = await getResend().emails.send({
      from: 'LeadFlow AI <onboarding@leadflow.ai>',
      to: agent.email,
      subject: `Your LeadFlow AI trial expires in ${daysRemaining} days`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1f2937; margin-bottom: 16px;">Your LeadFlow AI trial expires in ${daysRemaining} days</h2>
          
          <p style="color: #4b5563; margin-bottom: 16px;">Hi ${agentName},</p>
          
          <p style="color: #4b5563; margin-bottom: 16px;">
            Your LeadFlow AI trial expires in ${daysRemaining} days. You've already seen it work — 
            now it's time to make it official and start converting leads at scale.
          </p>
          
          <p style="color: #4b5563; margin-bottom: 24px;">
            Ready to keep the leads flowing? Upgrade to Pro for just <strong>$149/month</strong>.
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${APP_URL}/dashboard/upgrade?plan=pro" style="display: inline-block; background-color: #10b981; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600;">
              Upgrade Now →
            </a>
          </div>
          
          <p style="color: #9ca3af; margin-top: 32px; font-size: 14px;">
            Questions? Reply to this email or contact <a href="mailto:support@leadflow.ai" style="color: #10b981; text-decoration: none;">support@leadflow.ai</a>
          </p>
          
          <p style="color: #9ca3af; font-size: 14px;">— The LeadFlow Team</p>
        </div>
      `
    })

    if (error) {
      console.error(`Failed to send day 6 email to ${agent.email}:`, error)
      return { success: false, error: error.message }
    }

    // Mark email as sent
    const { error: updateError } = await supabase
      .from('real_estate_agents')
      .update({ trial_email_day6_sent: true })
      .eq('id', agent.id)

    if (updateError) {
      console.error(`Failed to mark day 6 email as sent for ${agent.id}:`, updateError)
    }

    // Log the email send
    await supabase.from('trial_email_logs').insert({
      agent_id: agent.id,
      email_type: 'trial_day6',
      email_address: agent.email,
      delivery_status: 'sent'
    })

    return { success: true }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    console.error(`Day 6 email error for ${agent.email}:`, error)
    return { success: false, error }
  }
}

/**
 * Send day 3 reminder email
 */
async function sendDay3Email(agent: TrialAgent): Promise<{ success: boolean; error?: string }> {
  try {
    const agentName = agent.first_name || 'there'
    const daysRemaining = getDaysRemaining(agent.trial_ends_at)

    const { error } = await getResend().emails.send({
      from: 'LeadFlow AI <onboarding@leadflow.ai>',
      to: agent.email,
      subject: `${agentName}, your trial ends in ${daysRemaining} days — upgrade now`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1f2937; margin-bottom: 16px;">Your trial ends in ${daysRemaining} days</h2>
          
          <p style="color: #4b5563; margin-bottom: 16px;">Hi ${agentName},</p>
          
          <p style="color: #4b5563; margin-bottom: 16px;">
            Your LeadFlow AI trial expires in ${daysRemaining} days. Don't lose your leads.
          </p>
          
          <p style="color: #4b5563; margin-bottom: 24px;">
            Upgrade to Pro (<strong>$149/month</strong>) and keep responding to every lead automatically. 
            Pro agents are converting their leads at record rates.
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${APP_URL}/dashboard/upgrade?plan=pro" style="display: inline-block; background-color: #10b981; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-right: 12px;">
              Upgrade to Pro →
            </a>
          </div>
          
          <p style="color: #4b5563; margin-top: 24px; margin-bottom: 16px;">
            Or try <a href="${APP_URL}/dashboard/upgrade?plan=team" style="color: #10b981; text-decoration: none; font-weight: 600;">Team plan</a> if you want to add other agents.
          </p>
          
          <p style="color: #9ca3af; margin-top: 32px; font-size: 14px;">
            Questions? Reply to this email or contact <a href="mailto:support@leadflow.ai" style="color: #10b981; text-decoration: none;">support@leadflow.ai</a>
          </p>
          
          <p style="color: #9ca3af; font-size: 14px;">— LeadFlow</p>
        </div>
      `
    })

    if (error) {
      console.error(`Failed to send day 3 email to ${agent.email}:`, error)
      return { success: false, error: error.message }
    }

    // Mark email as sent
    const { error: updateError } = await supabase
      .from('real_estate_agents')
      .update({ trial_email_day3_sent: true })
      .eq('id', agent.id)

    if (updateError) {
      console.error(`Failed to mark day 3 email as sent for ${agent.id}:`, updateError)
    }

    // Log the email send
    await supabase.from('trial_email_logs').insert({
      agent_id: agent.id,
      email_type: 'trial_day3',
      email_address: agent.email,
      delivery_status: 'sent'
    })

    return { success: true }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    console.error(`Day 3 email error for ${agent.email}:`, error)
    return { success: false, error }
  }
}

/**
 * Send day 1 reminder email
 */
async function sendDay1Email(agent: TrialAgent): Promise<{ success: boolean; error?: string }> {
  try {
    const agentName = agent.first_name || 'there'

    const { error } = await getResend().emails.send({
      from: 'LeadFlow AI <onboarding@leadflow.ai>',
      to: agent.email,
      subject: `Last day to upgrade, ${agentName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626; margin-bottom: 16px;">Last day to upgrade!</h2>
          
          <p style="color: #4b5563; margin-bottom: 16px;">Hi ${agentName},</p>
          
          <p style="color: #4b5563; margin-bottom: 16px;">
            Your LeadFlow AI trial expires <strong>TOMORROW</strong>. This is your last chance to upgrade.
          </p>
          
          <p style="color: #4b5563; margin-bottom: 24px;">
            Don't lose your leads. Click below to upgrade to Pro for $149/month.
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${APP_URL}/dashboard/upgrade?plan=pro" style="display: inline-block; background-color: #dc2626; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600;">
              Upgrade Now →
            </a>
          </div>
          
          <p style="color: #4b5563; margin-top: 24px; font-size: 14px;">
            We'll disable your account at midnight if you don't upgrade. You can re-enable anytime by paying.
          </p>
          
          <p style="color: #9ca3af; margin-top: 32px; font-size: 14px;">
            Questions? Reply to this email or contact <a href="mailto:support@leadflow.ai" style="color: #10b981; text-decoration: none;">support@leadflow.ai</a>
          </p>
          
          <p style="color: #9ca3af; font-size: 14px;">— LeadFlow</p>
        </div>
      `
    })

    if (error) {
      console.error(`Failed to send day 1 email to ${agent.email}:`, error)
      return { success: false, error: error.message }
    }

    // Mark email as sent
    const { error: updateError } = await supabase
      .from('real_estate_agents')
      .update({ trial_email_day1_sent: true })
      .eq('id', agent.id)

    if (updateError) {
      console.error(`Failed to mark day 1 email as sent for ${agent.id}:`, updateError)
    }

    // Log the email send
    await supabase.from('trial_email_logs').insert({
      agent_id: agent.id,
      email_type: 'trial_day1',
      email_address: agent.email,
      delivery_status: 'sent'
    })

    return { success: true }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    console.error(`Day 1 email error for ${agent.email}:`, error)
    return { success: false, error }
  }
}

/**
 * Send expired trial email
 */
async function sendExpiredEmail(agent: TrialAgent): Promise<{ success: boolean; error?: string }> {
  try {
    const agentName = agent.first_name || 'there'

    const { error } = await getResend().emails.send({
      from: 'LeadFlow AI <onboarding@leadflow.ai>',
      to: agent.email,
      subject: `Your LeadFlow trial has expired`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1f2937; margin-bottom: 16px;">Your LeadFlow trial has expired</h2>
          
          <p style="color: #4b5563; margin-bottom: 16px;">Hi ${agentName},</p>
          
          <p style="color: #4b5563; margin-bottom: 16px;">
            Your LeadFlow AI trial ended today. You still have a few days to upgrade and restore your account.
          </p>
          
          <p style="color: #4b5563; margin-bottom: 24px;">
            All your leads and settings are saved and ready to go. Just upgrade to Pro to start responding again.
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${APP_URL}/dashboard/upgrade?plan=pro" style="display: inline-block; background-color: #10b981; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600;">
              Reactivate with Pro →
            </a>
          </div>
          
          <p style="color: #4b5563; margin-top: 24px; font-size: 14px;">
            Questions? Reply to this email or contact <a href="mailto:support@leadflow.ai" style="color: #10b981; text-decoration: none;">support@leadflow.ai</a>
          </p>
          
          <p style="color: #9ca3af; font-size: 14px;">— LeadFlow</p>
        </div>
      `
    })

    if (error) {
      console.error(`Failed to send expired email to ${agent.email}:`, error)
      return { success: false, error: error.message }
    }

    // Mark email as sent
    const { error: updateError } = await supabase
      .from('real_estate_agents')
      .update({ trial_email_expired_sent: true })
      .eq('id', agent.id)

    if (updateError) {
      console.error(`Failed to mark expired email as sent for ${agent.id}:`, updateError)
    }

    // Log the email send
    await supabase.from('trial_email_logs').insert({
      agent_id: agent.id,
      email_type: 'trial_expired',
      email_address: agent.email,
      delivery_status: 'sent'
    })

    return { success: true }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    console.error(`Expired email error for ${agent.email}:`, error)
    return { success: false, error }
  }
}

/**
 * Main function to send all trial reminder emails
 * Called by cron job or heartbeat
 */
export async function sendTrialReminderEmails(): Promise<EmailResult[]> {
  const results: EmailResult[] = []

  try {
    // Day 6 emails
    console.log('📧 Checking for day 6 eligible agents...')
    const day6Agents = await getDay6Eligible()
    if (day6Agents.length > 0) {
      console.log(`Found ${day6Agents.length} agents eligible for day 6 email`)
      let success = 0
      let failed = 0
      const errors: string[] = []

      for (const agent of day6Agents) {
        const result = await sendDay6Email(agent)
        if (result.success) {
          success++
        } else {
          failed++
          if (result.error) errors.push(`${agent.email}: ${result.error}`)
        }
      }

      results.push({
        type: 'day6',
        count: day6Agents.length,
        success,
        failed,
        errors
      })
      console.log(`✅ Day 6: ${success}/${day6Agents.length} emails sent`)
    }

    // Day 3 emails
    console.log('📧 Checking for day 3 eligible agents...')
    const day3Agents = await getDay3Eligible()
    if (day3Agents.length > 0) {
      console.log(`Found ${day3Agents.length} agents eligible for day 3 email`)
      let success = 0
      let failed = 0
      const errors: string[] = []

      for (const agent of day3Agents) {
        const result = await sendDay3Email(agent)
        if (result.success) {
          success++
        } else {
          failed++
          if (result.error) errors.push(`${agent.email}: ${result.error}`)
        }
      }

      results.push({
        type: 'day3',
        count: day3Agents.length,
        success,
        failed,
        errors
      })
      console.log(`✅ Day 3: ${success}/${day3Agents.length} emails sent`)
    }

    // Day 1 emails
    console.log('📧 Checking for day 1 eligible agents...')
    const day1Agents = await getDay1Eligible()
    if (day1Agents.length > 0) {
      console.log(`Found ${day1Agents.length} agents eligible for day 1 email`)
      let success = 0
      let failed = 0
      const errors: string[] = []

      for (const agent of day1Agents) {
        const result = await sendDay1Email(agent)
        if (result.success) {
          success++
        } else {
          failed++
          if (result.error) errors.push(`${agent.email}: ${result.error}`)
        }
      }

      results.push({
        type: 'day1',
        count: day1Agents.length,
        success,
        failed,
        errors
      })
      console.log(`✅ Day 1: ${success}/${day1Agents.length} emails sent`)
    }

    // Expired emails
    console.log('📧 Checking for expired trial agents...')
    const expiredAgents = await getExpiredEligible()
    if (expiredAgents.length > 0) {
      console.log(`Found ${expiredAgents.length} agents with expired trials`)
      let success = 0
      let failed = 0
      const errors: string[] = []

      for (const agent of expiredAgents) {
        const result = await sendExpiredEmail(agent)
        if (result.success) {
          success++
        } else {
          failed++
          if (result.error) errors.push(`${agent.email}: ${result.error}`)
        }
      }

      results.push({
        type: 'expired',
        count: expiredAgents.length,
        success,
        failed,
        errors
      })
      console.log(`✅ Expired: ${success}/${expiredAgents.length} emails sent`)
    }

    return results
  } catch (error) {
    console.error('Error in sendTrialReminderEmails:', error)
    throw error
  }
}
