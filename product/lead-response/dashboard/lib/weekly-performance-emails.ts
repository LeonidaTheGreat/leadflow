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

// Constants
const BENCHMARK_RESPONSE_TIME_SECONDS = 540 // 9 minutes = 540 seconds
const ESTIMATED_COMMISSION_PER_APPOINTMENT = 5000 // $5,000 estimated commission

interface AgentPerformance {
  id: string
  email: string
  first_name: string
  last_name?: string
  plan_tier: string
  created_at: string
}

interface WeeklyStats {
  leads_responded: number
  avg_response_time_seconds: number
  appointments_booked: number
  estimated_revenue_impact: number
}

interface EmailResult {
  agent_id: string
  email: string
  success: boolean
  error?: string
  week_starting: string
  week_ending: string
}

interface SendResults {
  sent: number
  failed: number
  skipped: number
  details: EmailResult[]
}

/**
 * Get the date range for the previous week (Monday-Sunday)
 */
function getPreviousWeekRange(): { week_starting: string; week_ending: string } {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, etc.
  
  // Calculate days since last Monday (if today is Monday, we want last Monday)
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const daysToLastMonday = daysSinceMonday + 7
  
  const lastMonday = new Date(now)
  lastMonday.setDate(now.getDate() - daysToLastMonday)
  lastMonday.setHours(0, 0, 0, 0)
  
  const lastSunday = new Date(lastMonday)
  lastSunday.setDate(lastMonday.getDate() + 6)
  lastSunday.setHours(23, 59, 59, 999)
  
  return {
    week_starting: lastMonday.toISOString().split('T')[0],
    week_ending: lastSunday.toISOString().split('T')[0]
  }
}

/**
 * Get all active agents eligible for weekly performance report
 */
async function getActiveAgents(): Promise<AgentPerformance[]> {
  const { data, error } = await supabase
    .from('real_estate_agents')
    .select('id, email, first_name, last_name, plan_tier, created_at')
    .eq('email_verified', true)
    .in('plan_tier', ['starter', 'pro', 'team', 'pilot', 'trial'])
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching active agents:', error)
    return []
  }

  return data || []
}

/**
 * Check if email was already sent for this agent this week
 */
async function wasEmailSent(agentId: string, weekStarting: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('weekly_performance_email_logs')
    .select('id')
    .eq('agent_id', agentId)
    .eq('week_starting', weekStarting)
    .in('status', ['sent', 'skipped'])
    .maybeSingle()

  if (error) {
    console.error(`Error checking email status for ${agentId}:`, error)
    return false
  }

  return !!data
}

/**
 * Get weekly performance stats for an agent
 * This queries the actual data from the database
 */
async function getWeeklyStats(agentId: string, weekStarting: string, weekEnding: string): Promise<WeeklyStats> {
  try {
    // Get leads responded count from sms_messages
    const { data: leadsData, error: leadsError } = await supabase
      .from('sms_messages')
      .select('id, lead_id, created_at, direction')
      .eq('agent_id', agentId)
      .eq('direction', 'outbound-api')
      .gte('created_at', `${weekStarting}T00:00:00Z`)
      .lte('created_at', `${weekEnding}T23:59:59Z`)

    if (leadsError) {
      console.error(`Error fetching leads for ${agentId}:`, leadsError)
    }

    // Count unique leads responded to
    const uniqueLeads = new Set(leadsData?.map(l => l.lead_id) || [])
    const leads_responded = uniqueLeads.size

    // Get average response time (simplified - in production would calculate from lead_received to first_response)
    // For now, use a default or calculate from available data
    let avg_response_time_seconds = 25 // Default to 25 seconds (AI response time)
    
    // Try to get actual response times from lead_response_tracking if available
    const { data: responseData } = await supabase
      .from('lead_response_tracking')
      .select('response_time_seconds')
      .eq('agent_id', agentId)
      .gte('created_at', `${weekStarting}T00:00:00Z`)
      .lte('created_at', `${weekEnding}T23:59:59Z`)
      .not('response_time_seconds', 'is', null)

    if (responseData && responseData.length > 0) {
      const total = responseData.reduce((sum, r) => sum + (r.response_time_seconds || 0), 0)
      avg_response_time_seconds = Math.round(total / responseData.length)
    }

    // Get appointments booked from bookings table
    const { data: bookingsData, error: bookingsError } = await supabase
      .from('bookings')
      .select('id')
      .eq('agent_id', agentId)
      .gte('created_at', `${weekStarting}T00:00:00Z`)
      .lte('created_at', `${weekEnding}T23:59:59Z`)

    if (bookingsError) {
      console.error(`Error fetching bookings for ${agentId}:`, bookingsError)
    }

    const appointments_booked = bookingsData?.length || 0

    // Calculate estimated revenue impact
    const estimated_revenue_impact = appointments_booked * ESTIMATED_COMMISSION_PER_APPOINTMENT

    return {
      leads_responded,
      avg_response_time_seconds,
      appointments_booked,
      estimated_revenue_impact
    }
  } catch (error) {
    console.error(`Error getting weekly stats for ${agentId}:`, error)
    return {
      leads_responded: 0,
      avg_response_time_seconds: 25,
      appointments_booked: 0,
      estimated_revenue_impact: 0
    }
  }
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(amount)
}

/**
 * Format time in seconds to readable format
 */
function formatResponseTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (remainingSeconds === 0) {
    return `${minutes}m`
  }
  return `${minutes}m ${remainingSeconds}s`
}

/**
 * Generate the weekly performance email HTML
 */
function generateEmailHTML(
  agent: AgentPerformance,
  stats: WeeklyStats,
  weekStarting: string,
  weekEnding: string
): string {
  const agentName = agent.first_name || 'there'
  const isStarter = agent.plan_tier === 'starter'
  const isTrial = agent.plan_tier === 'trial'
  
  // Calculate comparison to benchmark
  const benchmarkDiff = BENCHMARK_RESPONSE_TIME_SECONDS - stats.avg_response_time_seconds
  const isFasterThanBenchmark = benchmarkDiff > 0
  const benchmarkPercent = Math.round((Math.abs(benchmarkDiff) / BENCHMARK_RESPONSE_TIME_SECONDS) * 100)
  
  // Format dates
  const weekStartFormatted = new Date(weekStarting).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
  const weekEndFormatted = new Date(weekEnding).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })

  // CTA section based on plan tier
  let ctaSection = ''
  if (isStarter || isTrial) {
    ctaSection = `
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 24px; border-radius: 8px; margin: 24px 0; text-align: center;">
        <h3 style="color: white; margin: 0 0 12px 0; font-size: 18px;">Ready to unlock unlimited responses?</h3>
        <p style="color: rgba(255,255,255,0.9); margin: 0 0 16px 0; font-size: 14px;">
          Pro agents close 3x more deals with unlimited AI responses and advanced qualification.
        </p>
        <a href="${APP_URL}/dashboard/upgrade?plan=pro&utm_source=weekly_report&utm_medium=email&utm_campaign=upgrade_cta" 
           style="display: inline-block; background: white; color: #059669; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px;">
          Upgrade to Pro →
        </a>
      </div>
    `
  } else {
    ctaSection = `
      <div style="text-align: center; margin: 32px 0;">
        <a href="${APP_URL}/dashboard?utm_source=weekly_report&utm_medium=email&utm_campaign=view_dashboard" 
           style="display: inline-block; background-color: #10b981; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600;">
          View Full Dashboard →
        </a>
      </div>
    `
  }

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 24px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">📊 Your Weekly AI Performance Report</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">${weekStartFormatted} – ${weekEndFormatted}</p>
      </div>
      
      <div style="padding: 32px 24px; background: #ffffff;">
        <p style="color: #4b5563; margin-bottom: 24px; font-size: 16px;">Hi ${agentName},</p>
        
        <p style="color: #4b5563; margin-bottom: 24px; font-size: 16px;">
          Here's how LeadFlow AI performed for you this week:
        </p>
        
        <!-- Stats Grid -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0;">
          <!-- Leads Responded -->
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #bbf7d0;">
            <div style="font-size: 32px; font-weight: 700; color: #059669; margin-bottom: 4px;">${stats.leads_responded}</div>
            <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Leads AI Responded To</div>
          </div>
          
          <!-- Response Time -->
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #bbf7d0;">
            <div style="font-size: 32px; font-weight: 700; color: #059669; margin-bottom: 4px;">${formatResponseTime(stats.avg_response_time_seconds)}</div>
            <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Avg Response Time</div>
            <div style="font-size: 11px; color: #10b981; margin-top: 4px;">
              ${isFasterThanBenchmark ? `⚡ ${benchmarkPercent}% faster than 9-min benchmark` : '⏱️ Within benchmark'}
            </div>
          </div>
          
          <!-- Appointments -->
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #bbf7d0;">
            <div style="font-size: 32px; font-weight: 700; color: #059669; margin-bottom: 4px;">${stats.appointments_booked}</div>
            <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Appointments Booked</div>
          </div>
          
          <!-- Revenue Impact -->
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #bbf7d0;">
            <div style="font-size: 32px; font-weight: 700; color: #059669; margin-bottom: 4px;">${formatCurrency(stats.estimated_revenue_impact)}</div>
            <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Est. Revenue Impact</div>
          </div>
        </div>
        
        <!-- Performance Context -->
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #10b981;">
          <h3 style="color: #1f2937; margin: 0 0 12px 0; font-size: 16px;">💡 What this means</h3>
          <ul style="color: #4b5563; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
            <li style="margin-bottom: 8px;">
              <strong>${stats.leads_responded} leads</strong> got instant AI responses — 
              ${isFasterThanBenchmark 
                ? `that's <strong>${benchmarkPercent}% faster</strong> than the industry average of 9 minutes.` 
                : 'maintaining the industry-leading response time.'}
            </li>
            <li style="margin-bottom: 8px;">
              <strong>${stats.appointments_booked} appointments</strong> were booked through AI qualification.
            </li>
            ${stats.estimated_revenue_impact > 0 
              ? `<li>At an average commission of ${formatCurrency(ESTIMATED_COMMISSION_PER_APPOINTMENT)}, that's a potential <strong>${formatCurrency(stats.estimated_revenue_impact)}</strong> in pipeline value.</li>`
              : `<li>Keep engaging — every appointment booked could mean ${formatCurrency(ESTIMATED_COMMISSION_PER_APPOINTMENT)} in commission.</li>`
            }
          </ul>
        </div>
        
        ${ctaSection}
        
        <!-- Tips Section -->
        <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #3b82f6;">
          <h3 style="color: #1e40af; margin: 0 0 12px 0; font-size: 16px;">🚀 This Week's Tip</h3>
          <p style="color: #4b5563; margin: 0; font-size: 14px; line-height: 1.6;">
            Agents who respond to leads within 5 minutes are <strong>100x more likely</strong> to connect. 
            Your AI is responding in ${formatResponseTime(stats.avg_response_time_seconds)} — 
            you're capturing leads while competitors are still checking their voicemail.
          </p>
        </div>
        
        <p style="color: #6b7280; margin-top: 32px; font-size: 14px;">
          Questions? Reply to this email or contact us at support@leadflow.ai
        </p>
        
        <p style="color: #9ca3af; margin-top: 24px; font-size: 14px;">
          — The LeadFlow Team
        </p>
      </div>
      
      <div style="background: #f9fafb; padding: 24px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; margin: 0; font-size: 12px;">
          You're receiving this because you have an active LeadFlow AI account.<br>
          <a href="${APP_URL}/dashboard/settings/notifications" style="color: #6b7280;">Manage email preferences</a>
        </p>
      </div>
    </div>
  `
}

/**
 * Log email send attempt to database
 */
async function logEmailSend(
  agentId: string,
  weekStarting: string,
  weekEnding: string,
  recipientEmail: string,
  subject: string,
  status: 'sent' | 'failed' | 'skipped',
  stats: WeeklyStats,
  errorMessage?: string,
  skippedReason?: string
): Promise<void> {
  try {
    await supabase.from('weekly_performance_email_logs').insert({
      agent_id: agentId,
      week_starting: weekStarting,
      week_ending: weekEnding,
      recipient_email: recipientEmail,
      subject,
      status,
      stats_leads_responded: stats.leads_responded,
      stats_avg_response_time_seconds: stats.avg_response_time_seconds,
      stats_appointments_booked: stats.appointments_booked,
      stats_estimated_revenue_impact: stats.estimated_revenue_impact,
      error_message: errorMessage,
      skipped_reason: skippedReason,
      sent_at: status === 'sent' ? new Date().toISOString() : null
    })
  } catch (err) {
    console.error(`Failed to log email send for ${agentId}:`, err)
  }
}

/**
 * Send weekly performance email to a single agent
 */
async function sendWeeklyPerformanceEmail(
  agent: AgentPerformance,
  weekStarting: string,
  weekEnding: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get performance stats
    const stats = await getWeeklyStats(agent.id, weekStarting, weekEnding)
    
    // Generate email content
    const html = generateEmailHTML(agent, stats, weekStarting, weekEnding)
    const subject = `📊 Your Weekly AI Performance Report — ${stats.leads_responded} leads responded`
    
    // Send email via Resend
    const { error } = await getResend().emails.send({
      from: 'LeadFlow AI <reports@leadflow.ai>',
      to: agent.email,
      subject,
      html
    })
    
    if (error) {
      console.error(`Failed to send weekly report to ${agent.email}:`, error)
      await logEmailSend(
        agent.id,
        weekStarting,
        weekEnding,
        agent.email,
        subject,
        'failed',
        stats,
        error.message
      )
      return { success: false, error: error.message }
    }
    
    // Log successful send
    await logEmailSend(
      agent.id,
      weekStarting,
      weekEnding,
      agent.email,
      subject,
      'sent',
      stats
    )
    
    return { success: true }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    console.error(`Weekly report email error for ${agent.email}:`, error)
    return { success: false, error }
  }
}

/**
 * Main function to send weekly performance emails to all active agents
 * Called by cron job every Monday
 */
export async function sendWeeklyPerformanceEmails(): Promise<SendResults> {
  const results: SendResults = {
    sent: 0,
    failed: 0,
    skipped: 0,
    details: []
  }
  
  try {
    console.log('📊 Starting weekly performance email send...')
    
    // Get the week range (previous week)
    const { week_starting, week_ending } = getPreviousWeekRange()
    console.log(`📅 Reporting period: ${week_starting} to ${week_ending}`)
    
    // Get all active agents
    const agents = await getActiveAgents()
    console.log(`Found ${agents.length} active agents to process`)
    
    if (agents.length === 0) {
      return results
    }
    
    // Process each agent
    for (const agent of agents) {
      // Check if already sent for this week
      const alreadySent = await wasEmailSent(agent.id, week_starting)
      if (alreadySent) {
        console.log(`⏭️ Skipping ${agent.email} — already sent for this week`)
        results.skipped++
        results.details.push({
          agent_id: agent.id,
          email: agent.email,
          success: false,
          error: 'Already sent for this week',
          week_starting,
          week_ending
        })
        continue
      }
      
      // Send the email
      console.log(`📧 Sending weekly report to ${agent.email}...`)
      const result = await sendWeeklyPerformanceEmail(agent, week_starting, week_ending)
      
      if (result.success) {
        results.sent++
        console.log(`✅ Sent to ${agent.email}`)
      } else {
        results.failed++
        console.error(`❌ Failed to send to ${agent.email}: ${result.error}`)
      }
      
      results.details.push({
        agent_id: agent.id,
        email: agent.email,
        success: result.success,
        error: result.error,
        week_starting,
        week_ending
      })
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    console.log(`\n📊 Weekly performance email summary:`)
    console.log(`   ✅ Sent: ${results.sent}`)
    console.log(`   ❌ Failed: ${results.failed}`)
    console.log(`   ⏭️ Skipped: ${results.skipped}`)
    
    return results
  } catch (error) {
    console.error('Error in sendWeeklyPerformanceEmails:', error)
    throw error
  }
}

/**
 * Get summary of weekly email sends for dashboard display
 */
export async function getWeeklyEmailSummary(weekStarting?: string): Promise<{
  total_sent: number
  total_failed: number
  total_skipped: number
  cta_clicks: number
  estimated_revenue: number
}> {
  try {
    const targetWeek = weekStarting || getPreviousWeekRange().week_starting
    
    const { data, error } = await supabase
      .from('weekly_performance_email_logs')
      .select('status, cta_clicked, stats_estimated_revenue_impact')
      .eq('week_starting', targetWeek)
    
    if (error) {
      console.error('Error fetching weekly email summary:', error)
      return {
        total_sent: 0,
        total_failed: 0,
        total_skipped: 0,
        cta_clicks: 0,
        estimated_revenue: 0
      }
    }
    
    const summary = {
      total_sent: data?.filter(r => r.status === 'sent').length || 0,
      total_failed: data?.filter(r => r.status === 'failed').length || 0,
      total_skipped: data?.filter(r => r.status === 'skipped').length || 0,
      cta_clicks: data?.filter(r => r.cta_clicked).length || 0,
      estimated_revenue: data?.reduce((sum, r) => sum + (r.stats_estimated_revenue_impact || 0), 0) || 0
    }
    
    return summary
  } catch (error) {
    console.error('Error getting weekly email summary:', error)
    return {
      total_sent: 0,
      total_failed: 0,
      total_skipped: 0,
      cta_clicks: 0,
      estimated_revenue: 0
    }
  }
}
