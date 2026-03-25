/**
 * Pilot-to-Paid Conversion Email Service
 * 
 * Handles the automated email sequence to convert pilot agents to paid Pro plan:
 * - Day 30: Midpoint value recap + upgrade offer
 * - Day 45: ROI recap + urgency
 * - Day 55: Final warning (5 days left)
 * 
 * Features:
 * - Idempotent sends (one per milestone per agent)
 * - Stop-on-upgrade logic
 * - Personalized stats in each email
 * - Comprehensive logging
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase: SupabaseClient | null = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// Resend configuration
// .trim() guards against trailing whitespace/newlines in env var values (e.g. from .env files)
const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim();
const FROM_EMAIL = (process.env.FROM_EMAIL || 'stojan@leadflow.ai').trim();
const FROM_NAME = 'LeadFlow';

// Stripe configuration for checkout links
const STRIPE_PRICE_PRO = process.env.STRIPE_PRICE_PRO;

/**
 * Milestone configuration
 */
export const MILESTONES = {
  day_30: {
    days: 30,
    subject: '{{firstName}}, you\'re halfway through your pilot — here\'s what you\'ve achieved 🚀',
    template: 'day30_midpoint'
  },
  day_45: {
    days: 45,
    subject: '{{firstName}}, only 15 days left — don\'t lose your AI advantage ⏰',
    template: 'day45_urgent'
  },
  day_55: {
    days: 55,
    subject: '{{firstName}}, 5 days left: Secure your Pro access now ⚠️',
    template: 'day55_final'
  }
} as const;

export type MilestoneKey = keyof typeof MILESTONES;

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}

/**
 * Check if Resend is configured
 */
export function isResendConfigured(): boolean {
  return !!RESEND_API_KEY;
}

/**
 * Get pilot agents eligible for a specific milestone
 */
export async function getEligibleAgents(milestone: MilestoneKey): Promise<any[]> {
  if (!isSupabaseConfigured() || !supabase) {
    console.warn('Supabase not configured, returning empty agent list');
    return [];
  }

  const config = MILESTONES[milestone];
  if (!config) {
    throw new Error(`Invalid milestone: ${milestone}`);
  }

  try {
    // Use the database function to get eligible agents
    const { data: agents, error } = await supabase
      .rpc('get_pilot_agents_for_milestone', { p_milestone: milestone });

    if (error) {
      console.error('Error fetching eligible agents:', error);
      throw error;
    }

    console.log(`[Pilot Conversion] Found ${agents?.length || 0} agents eligible for ${milestone}`);
    return agents || [];

  } catch (error) {
    console.error(`Error getting eligible agents for ${milestone}:`, error);
    throw error;
  }
}

/**
 * Calculate personalized stats for an agent
 */
export async function getAgentStats(agentId: string): Promise<{
  leadsResponded: number;
  avgResponseTime: string;
  appointmentsBooked: number;
}> {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      leadsResponded: 0,
      avgResponseTime: 'N/A',
      appointmentsBooked: 0
    };
  }

  try {
    // Get leads responded count
    const { data: leadsData, error: leadsError } = await supabase
      .from('leads')
      .select('id, responded_at, created_at')
      .eq('agent_id', agentId)
      .not('responded_at', 'is', null);

    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
    }

    const leadsResponded = leadsData?.length || 0;

    // Calculate average response time
    let avgResponseTime = 'N/A';
    if (leadsData && leadsData.length > 0) {
      const responseTimes = leadsData
        .filter((lead: any) => lead.responded_at && lead.created_at)
        .map((lead: any) => {
          const responseTime = new Date(lead.responded_at).getTime() - new Date(lead.created_at).getTime();
          return responseTime / 1000; // Convert to seconds
        });
      
      if (responseTimes.length > 0) {
        const avgSeconds = responseTimes.reduce((a: number, b: number) => a + b, 0) / responseTimes.length;
        if (avgSeconds < 60) {
          avgResponseTime = `${Math.round(avgSeconds)} seconds`;
        } else if (avgSeconds < 3600) {
          avgResponseTime = `${Math.round(avgSeconds / 60)} minutes`;
        } else {
          avgResponseTime = `${(avgSeconds / 3600).toFixed(1)} hours`;
        }
      }
    }

    // Get appointments booked count
    const { data: bookingsData } = await supabase
      .from('bookings')
      .select('id')
      .eq('agent_id', agentId);

    const appointmentsBooked = bookingsData?.length || 0;

    return {
      leadsResponded,
      avgResponseTime,
      appointmentsBooked
    };

  } catch (error) {
    console.error(`Error getting stats for agent ${agentId}:`, error);
    return {
      leadsResponded: 0,
      avgResponseTime: 'N/A',
      appointmentsBooked: 0
    };
  }
}

/**
 * Generate Stripe checkout URL for Pro plan
 */
function generateCheckoutUrl(agent: any): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-five.vercel.app';
  return `${baseUrl}/billing/upgrade?agent=${agent.agent_id}&plan=pro&source=pilot_conversion`;
}

/**
 * Render email template with personalization
 */
function renderTemplate(
  template: string,
  agent: any,
  stats: { leadsResponded: number; avgResponseTime: string; appointmentsBooked: number },
  checkoutUrl: string
): { html: string; text: string } {
  const firstName = agent.agent_name ? agent.agent_name.split(' ')[0] : 'there';

  const templates: Record<string, { html: string; text: string }> = {
    day30_midpoint: {
      html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Pilot Progress</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">You're Halfway There! 🎉</h1>
  </div>
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${firstName},</p>
    <p>You're 30 days into your LeadFlow pilot, and the results are speaking for themselves:</p>
    <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <div style="text-align: center; margin-bottom: 15px;">
        <span style="font-size: 36px; font-weight: bold; color: #667eea;">${stats.leadsResponded}</span>
        <p style="margin: 5px 0; color: #666;">Leads Responded</p>
      </div>
      <div style="text-align: center; margin-bottom: 15px;">
        <span style="font-size: 36px; font-weight: bold; color: #667eea;">${stats.avgResponseTime}</span>
        <p style="margin: 5px 0; color: #666;">Average Response Time</p>
      </div>
      <div style="text-align: center;">
        <span style="font-size: 36px; font-weight: bold; color: #667eea;">${stats.appointmentsBooked}</span>
        <p style="margin: 5px 0; color: #666;">Appointments Booked</p>
      </div>
    </div>
    <p>Your pilot expires in 30 days. Ready to lock in these results?</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${checkoutUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Upgrade to Pro →</a>
    </div>
    <p style="font-size: 14px; color: #666;">Questions? Reply to this email — I'm here to help.</p>
    <p style="margin-top: 30px;">Best,<br>Stojan<br>Founder, LeadFlow</p>
  </div>
</body>
</html>`,
      text: `Hi ${firstName},

You're 30 days into your LeadFlow pilot, and the results are speaking for themselves:

• Leads Responded: ${stats.leadsResponded}
• Average Response Time: ${stats.avgResponseTime}
• Appointments Booked: ${stats.appointmentsBooked}

Your pilot expires in 30 days. Ready to lock in these results?

Upgrade to Pro: ${checkoutUrl}

Questions? Reply to this email — I'm here to help.

Best,
Stojan
Founder, LeadFlow`
    },
    day45_urgent: {
      html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Only 15 Days Left</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #ff6b6b; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">⏰ Only 15 Days Left</h1>
  </div>
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${firstName},</p>
    <p>Your LeadFlow pilot expires in <strong>15 days</strong>. Here's what you've accomplished so far:</p>
    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; font-weight: bold;">Your Pilot Results:</p>
      <ul style="margin: 10px 0;">
        <li>${stats.leadsResponded} leads responded to instantly</li>
        <li>${stats.avgResponseTime} average response time</li>
        <li>${stats.appointmentsBooked} appointments booked automatically</li>
      </ul>
    </div>
    <p>Without LeadFlow, you'll go back to:</p>
    <ul style="color: #666;">
      <li>Missing leads while you're with clients</li>
      <li>Leads going cold before you can respond</li>
      <li>Manual scheduling back-and-forth</li>
    </ul>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${checkoutUrl}" style="background: #ff6b6b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Upgrade to Pro Now →</a>
    </div>
    <p style="font-size: 14px; color: #666;">Don't lose your AI advantage. Upgrade now and keep your edge.</p>
    <p style="margin-top: 30px;">Best,<br>Stojan<br>Founder, LeadFlow</p>
  </div>
</body>
</html>`,
      text: `Hi ${firstName},

Your LeadFlow pilot expires in 15 DAYS. Here's what you've accomplished so far:

Your Pilot Results:
• ${stats.leadsResponded} leads responded to instantly
• ${stats.avgResponseTime} average response time  
• ${stats.appointmentsBooked} appointments booked automatically

Without LeadFlow, you'll go back to:
• Missing leads while you're with clients
• Leads going cold before you can respond
• Manual scheduling back-and-forth

Upgrade to Pro Now: ${checkoutUrl}

Don't lose your AI advantage. Upgrade now and keep your edge.

Best,
Stojan
Founder, LeadFlow`
    },
    day55_final: {
      html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Final Notice: 5 Days Left</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #dc3545; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Final Notice: 5 Days Left</h1>
  </div>
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${firstName},</p>
    <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0; font-size: 18px; font-weight: bold; color: #721c24;">Your pilot expires in 5 days</p>
      <p style="margin: 10px 0 0 0; color: #721c24;">After that, your AI lead response will be paused.</p>
    </div>
    <p>Your pilot stats:</p>
    <ul>
      <li><strong>${stats.leadsResponded}</strong> leads responded</li>
      <li><strong>${stats.avgResponseTime}</strong> avg response</li>
      <li><strong>${stats.appointmentsBooked}</strong> appointments booked</li>
    </ul>
    <p>Don't let this slip away. Upgrade to Pro in the next 5 days:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${checkoutUrl}" style="background: #dc3545; color: white; padding: 18px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 18px; display: inline-block;">Secure Pro Access →</a>
    </div>
    <p style="font-size: 14px; color: #666; text-align: center;">This is your final reminder. Secure your Pro access now.</p>
    <p style="margin-top: 30px;">Best,<br>Stojan<br>Founder, LeadFlow</p>
  </div>
</body>
</html>`,
      text: `⚠️ FINAL NOTICE: 5 DAYS LEFT

Hi ${firstName},

Your LeadFlow pilot expires in 5 DAYS.
After that, your AI lead response will be PAUSED.

Your pilot stats:
• ${stats.leadsResponded} leads responded
• ${stats.avgResponseTime} avg response
• ${stats.appointmentsBooked} appointments booked

Don't let this slip away. Upgrade to Pro in the next 5 days:

Secure Pro Access: ${checkoutUrl}

This is your final reminder.

Best,
Stojan
Founder, LeadFlow`
    }
  };

  const selected = templates[template];
  if (!selected) {
    throw new Error(`Unknown template: ${template}`);
  }

  return selected;
}

/**
 * Send email via Resend
 */
async function sendEmailViaResend(
  to: string,
  subject: string,
  content: { html: string; text: string }
): Promise<{ success: boolean; id?: string; mock?: boolean }> {
  if (!isResendConfigured()) {
    console.warn('Resend not configured, logging email instead');
    console.log(`[MOCK EMAIL] To: ${to}, Subject: ${subject}`);
    return { success: true, mock: true, id: `mock_${Date.now()}` };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [to],
        subject: subject,
        html: content.html,
        text: content.text,
        tags: [{ name: 'campaign', value: 'pilot-conversion' }]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend API error: ${error}`);
    }

    const result = await response.json();
    return { success: true, id: result.id };

  } catch (error) {
    console.error('Error sending email via Resend:', error);
    throw error;
  }
}

/**
 * Log email send attempt to database
 */
async function logEmailSend(params: {
  agentId: string;
  milestone: MilestoneKey;
  templateKey: string;
  recipientEmail: string;
  subject: string;
  status: 'sent' | 'failed' | 'skipped';
  messageId?: string;
  errorMessage?: string;
  personalizedData?: any;
  stats?: {
    leadsResponded: number;
    avgResponseTime: string;
    appointmentsBooked: number;
  };
  skippedReason?: string;
}): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    console.log('[MOCK LOG] Email send logged:', params);
    return;
  }

  try {
    const { error } = await supabase
      .from('pilot_conversion_email_logs')
      .insert({
        agent_id: params.agentId,
        milestone: params.milestone,
        template_key: params.templateKey,
        template_version: '1.0',
        recipient_email: params.recipientEmail,
        subject: params.subject,
        status: params.status,
        provider: 'resend',
        provider_message_id: params.messageId,
        error_message: params.errorMessage,
        personalized_data: params.personalizedData || {},
        stats_leads_responded: params.stats?.leadsResponded,
        stats_avg_response_time_seconds: params.stats?.avgResponseTime === 'N/A' ? null : parseInt(params.stats?.avgResponseTime || '0'),
        stats_appointments_booked: params.stats?.appointmentsBooked,
        skipped_reason: params.skippedReason,
        sent_at: params.status === 'sent' ? new Date().toISOString() : null
      });

    if (error) {
      console.error('Error logging email send:', error);
    }
  } catch (error) {
    console.error('Error in logEmailSend:', error);
  }
}

/**
 * Check if agent has already upgraded (stop condition)
 */
export async function hasAgentUpgraded(agentId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) {
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('real_estate_agents')
      .select('plan_tier')
      .eq('id', agentId)
      .single();

    if (error) {
      console.error('Error checking agent plan tier:', error);
      return false;
    }

    return data && data.plan_tier !== 'pilot';

  } catch (error) {
    console.error('Error in hasAgentUpgraded:', error);
    return false;
  }
}

/**
 * Send conversion email for a specific milestone
 */
export async function sendConversionEmail(
  agent: any,
  milestone: MilestoneKey
): Promise<{ success: boolean; skipped?: boolean; reason?: string; error?: string; messageId?: string }> {
  const config = MILESTONES[milestone];
  
  try {
    // Check stop condition: has agent upgraded?
    const upgraded = await hasAgentUpgraded(agent.agent_id);
    if (upgraded) {
      console.log(`[Pilot Conversion] Skipping ${milestone} for ${agent.agent_email} - already upgraded`);
      await logEmailSend({
        agentId: agent.agent_id,
        milestone,
        templateKey: config.template,
        recipientEmail: agent.agent_email,
        subject: config.subject,
        status: 'skipped',
        skippedReason: 'already_upgraded'
      });
      return { success: false, skipped: true, reason: 'already_upgraded' };
    }

    // Get personalized stats
    const stats = await getAgentStats(agent.agent_id);
    
    // Generate checkout URL
    const checkoutUrl = generateCheckoutUrl(agent);
    
    // Render template
    const content = renderTemplate(config.template, agent, stats, checkoutUrl);
    
    // Personalize subject
    const firstName = agent.agent_name ? agent.agent_name.split(' ')[0] : 'there';
    const subject = config.subject.replace('{{firstName}}', firstName);
    
    // Send email
    const sendResult = await sendEmailViaResend(agent.agent_email, subject, content);
    
    // Log success
    await logEmailSend({
      agentId: agent.agent_id,
      milestone,
      templateKey: config.template,
      recipientEmail: agent.agent_email,
      subject,
      status: 'sent',
      messageId: sendResult.id,
      personalizedData: { checkoutUrl, stats },
      stats
    });

    console.log(`[Pilot Conversion] Sent ${milestone} email to ${agent.agent_email}`);
    return { success: true, messageId: sendResult.id };

  } catch (error: any) {
    console.error(`[Pilot Conversion] Failed to send ${milestone} to ${agent.agent_email}:`, error);
    
    // Log failure
    await logEmailSend({
      agentId: agent.agent_id,
      milestone,
      templateKey: config.template,
      recipientEmail: agent.agent_email,
      subject: config.subject,
      status: 'failed',
      errorMessage: error.message
    });

    return { success: false, error: error.message };
  }
}

/**
 * Process all eligible agents for a milestone
 */
export async function processMilestone(milestone: MilestoneKey): Promise<{
  milestone: MilestoneKey;
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
  errors: Array<{ agent?: string; error: string }>;
}> {
  console.log(`[Pilot Conversion] Processing ${milestone}...`);
  
  const results = {
    milestone,
    processed: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    errors: [] as Array<{ agent?: string; error: string }>
  };

  try {
    const agents = await getEligibleAgents(milestone);
    results.processed = agents.length;

    for (const agent of agents) {
      const result = await sendConversionEmail(agent, milestone);
      
      if (result.success) {
        results.sent++;
      } else if (result.skipped) {
        results.skipped++;
      } else {
        results.failed++;
        results.errors.push({ agent: agent.agent_email, error: result.error || 'Unknown error' });
      }
    }

    console.log(`[Pilot Conversion] ${milestone} complete: ${results.sent} sent, ${results.skipped} skipped, ${results.failed} failed`);
    return results;

  } catch (error: any) {
    console.error(`[Pilot Conversion] Error processing ${milestone}:`, error);
    results.errors.push({ error: error.message });
    return results;
  }
}

/**
 * Run the full conversion sequence check
 */
export async function runConversionSequence(): Promise<{
  timestamp: string;
  milestones: Record<MilestoneKey, {
    milestone: MilestoneKey;
    processed: number;
    sent: number;
    skipped: number;
    failed: number;
    errors: Array<{ agent?: string; error: string }>;
  }>;
}> {
  console.log('[Pilot Conversion] Starting conversion sequence check...');
  
  const results: {
    timestamp: string;
    milestones: Record<MilestoneKey, any>;
  } = {
    timestamp: new Date().toISOString(),
    milestones: {
      day_30: { milestone: 'day_30', processed: 0, sent: 0, skipped: 0, failed: 0, errors: [] },
      day_45: { milestone: 'day_45', processed: 0, sent: 0, skipped: 0, failed: 0, errors: [] },
      day_55: { milestone: 'day_55', processed: 0, sent: 0, skipped: 0, failed: 0, errors: [] }
    }
  };

  // Process each milestone
  for (const milestone of ['day_30', 'day_45', 'day_55'] as MilestoneKey[]) {
    results.milestones[milestone] = await processMilestone(milestone);
  }

  console.log('[Pilot Conversion] Sequence check complete');
  return results;
}
