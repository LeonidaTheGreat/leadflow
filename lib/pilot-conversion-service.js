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

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// Resend configuration
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'stojan@leadflow.ai';
const FROM_NAME = 'LeadFlow';

// Stripe configuration for checkout links
const STRIPE_PRICE_PRO = process.env.STRIPE_PRICE_PRO;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

/**
 * Milestone configuration
 */
const MILESTONES = {
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
};

/**
 * Check if Supabase is configured
 */
function isSupabaseConfigured() {
  return supabase !== null;
}

/**
 * Check if Resend is configured
 */
function isResendConfigured() {
  return !!RESEND_API_KEY;
}

/**
 * Get pilot agents eligible for a specific milestone
 * @param {string} milestone - 'day_30', 'day_45', or 'day_55'
 * @returns {Promise<Array>} Array of eligible agents
 */
async function getEligibleAgents(milestone) {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, returning empty agent list');
    return [];
  }

  const config = MILESTONES[milestone];
  if (!config) {
    throw new Error(`Invalid milestone: ${milestone}`);
  }

  try {
    // Get agents at or past the milestone days who haven't received this email
    // Note: real_estate_agents is the table for real estate agent customers
    const { data: agents, error } = await supabase
      .from('real_estate_agents')
      .select('id, email, first_name, last_name, plan_tier, pilot_started_at, stripe_customer_id')
      .eq('plan_tier', 'pilot')
      .not('pilot_started_at', 'is', null)
      .lte('pilot_started_at', new Date(Date.now() - config.days * 24 * 60 * 60 * 1000).toISOString())
      .order('pilot_started_at', { ascending: true });

    if (error) {
      console.error('Error fetching eligible agents:', error);
      throw error;
    }

    // Filter out agents who already received this milestone email
    if (!agents || agents.length === 0) {
      console.log(`[Pilot Conversion] No agents found for ${milestone}`);
      return [];
    }

    const { data: sentLogs, error: logError } = await supabase
      .from('pilot_conversion_email_logs')
      .select('agent_id, milestone')
      .in('agent_id', agents.map(a => a.id))
      .eq('milestone', milestone)
      .in('status', ['sent', 'skipped']);

    if (logError) {
      console.error('Error fetching email logs:', logError);
      throw logError;
    }

    const sentAgentIds = new Set(sentLogs?.map(log => log.agent_id) || []);
    const eligibleAgents = agents.filter(agent => !sentAgentIds.has(agent.id));

    console.log(`[Pilot Conversion] Found ${eligibleAgents.length} agents eligible for ${milestone}`);
    return eligibleAgents;

  } catch (error) {
    console.error(`Error getting eligible agents for ${milestone}:`, error);
    throw error;
  }
}

/**
 * Calculate personalized stats for an agent
 * @param {string} agentId - Agent UUID
 * @returns {Promise<Object>} Stats object
 */
async function getAgentStats(agentId) {
  if (!isSupabaseConfigured()) {
    return {
      leadsResponded: 0,
      avgResponseTime: 'N/A',
      appointmentsBooked: 0
    };
  }

  try {
    // Get leads responded count - try both possible lead tables
    let leadsData = null;
    let leadsError = null;
    
    try {
      const result = await supabase
        .from('leads')
        .select('id, responded_at, created_at')
        .eq('agent_id', agentId)
        .not('responded_at', 'is', null);
      leadsData = result.data;
      leadsError = result.error;
    } catch (e) {
      // Leads table might not exist, continue with 0
      leadsData = [];
    }

    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
    }

    const leadsResponded = leadsData?.length || 0;

    // Calculate average response time
    let avgResponseTime = 'N/A';
    if (leadsData && leadsData.length > 0) {
      const responseTimes = leadsData
        .filter(lead => lead.responded_at && lead.created_at)
        .map(lead => {
          const responseTime = new Date(lead.responded_at) - new Date(lead.created_at);
          return responseTime / 1000; // Convert to seconds
        });
      
      if (responseTimes.length > 0) {
        const avgSeconds = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
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
    let bookingsData = null;
    try {
      const result = await supabase
        .from('bookings')
        .select('id')
        .eq('agent_id', agentId);
      bookingsData = result.data;
    } catch (e) {
      // Bookings table might not exist
      bookingsData = [];
    }

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
 * @param {Object} agent - Agent object
 * @returns {string} Checkout URL
 */
function generateCheckoutUrl(agent) {
  // For now, return a placeholder URL that will be handled by the billing system
  // In production, this would generate a Stripe checkout session URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-five.vercel.app';
  return `${baseUrl}/billing/upgrade?agent=${agent.id}&plan=pro&source=pilot_conversion`;
}

/**
 * Render email template with personalization
 * @param {string} template - Template key
 * @param {Object} agent - Agent data
 * @param {Object} stats - Agent stats
 * @param {string} checkoutUrl - Upgrade URL
 * @returns {Object} HTML and plain text content
 */
function renderTemplate(template, agent, stats, checkoutUrl) {
  const firstName = agent.name ? agent.name.split(' ')[0] : 'there';
  const daysRemaining = template === 'day30_midpoint' ? 30 : 
                        template === 'day45_urgent' ? 15 : 5;

  // HTML Templates
  const templates = {
    day30_midpoint: {
      html: `
<!DOCTYPE html>
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
</html>
`,
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
Founder, LeadFlow
`
    },
    day45_urgent: {
      html: `
<!DOCTYPE html>
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
</html>
`,
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
Founder, LeadFlow
`
    },
    day55_final: {
      html: `
<!DOCTYPE html>
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
</html>
`,
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
Founder, LeadFlow
`
    }
  };

  const selectedTemplate = templates[template];
  if (!selectedTemplate) {
    throw new Error(`Unknown template: ${template}`);
  }

  return selectedTemplate;
}

/**
 * Send email via Resend
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {Object} content - HTML and text content
 * @returns {Promise<Object>} Send result
 */
async function sendEmailViaResend(to, subject, content) {
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
        tags: [
          { name: 'campaign', value: 'pilot-conversion' }
        ]
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
 * @param {Object} params - Log parameters
 */
async function logEmailSend(params) {
  if (!isSupabaseConfigured()) {
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
        personalized_data: params.personalizedData,
        stats_leads_responded: params.stats?.leadsResponded,
        stats_avg_response_time_seconds: params.stats?.avgResponseTimeSeconds,
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
 * @param {string} agentId - Agent UUID
 * @returns {Promise<boolean>} True if upgraded
 */
async function hasAgentUpgraded(agentId) {
  if (!isSupabaseConfigured()) {
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

    // If plan_tier is not 'pilot', they've upgraded
    return data && data.plan_tier !== 'pilot';

  } catch (error) {
    console.error('Error in hasAgentUpgraded:', error);
    return false;
  }
}

/**
 * Send conversion email for a specific milestone
 * @param {Object} agent - Agent object
 * @param {string} milestone - 'day_30', 'day_45', or 'day_55'
 * @returns {Promise<Object>} Send result
 */
async function sendConversionEmail(agent, milestone) {
  const config = MILESTONES[milestone];
  
  try {
    // Check stop condition: has agent upgraded?
    const upgraded = await hasAgentUpgraded(agent.id);
    if (upgraded) {
      console.log(`[Pilot Conversion] Skipping ${milestone} for ${agent.email} - already upgraded`);
      await logEmailSend({
        agentId: agent.id,
        milestone,
        templateKey: config.template,
        recipientEmail: agent.email,
        subject: config.subject,
        status: 'skipped',
        skippedReason: 'already_upgraded'
      });
      return { success: false, skipped: true, reason: 'already_upgraded' };
    }

    // Get personalized stats
    const stats = await getAgentStats(agent.id);
    
    // Generate checkout URL
    const checkoutUrl = generateCheckoutUrl(agent);
    
    // Render template
    const content = renderTemplate(config.template, agent, stats, checkoutUrl);
    
    // Personalize subject
    const firstName = agent.name ? agent.name.split(' ')[0] : 'there';
    const subject = config.subject.replace('{{firstName}}', firstName);
    
    // Send email
    const sendResult = await sendEmailViaResend(agent.email, subject, content);
    
    // Log success
    await logEmailSend({
      agentId: agent.id,
      milestone,
      templateKey: config.template,
      recipientEmail: agent.email,
      subject,
      status: 'sent',
      messageId: sendResult.id,
      personalizedData: {
        checkoutUrl,
        stats
      },
      stats: {
        leadsResponded: stats.leadsResponded,
        avgResponseTimeSeconds: stats.avgResponseTime === 'N/A' ? null : parseInt(stats.avgResponseTime),
        appointmentsBooked: stats.appointmentsBooked
      }
    });

    console.log(`[Pilot Conversion] Sent ${milestone} email to ${agent.email}`);
    return { success: true, messageId: sendResult.id };

  } catch (error) {
    console.error(`[Pilot Conversion] Failed to send ${milestone} to ${agent.email}:`, error);
    
    // Log failure
    await logEmailSend({
      agentId: agent.id,
      milestone,
      templateKey: config.template,
      recipientEmail: agent.email,
      subject: config.subject,
      status: 'failed',
      errorMessage: error.message
    });

    return { success: false, error: error.message };
  }
}

/**
 * Process all eligible agents for a milestone
 * @param {string} milestone - 'day_30', 'day_45', or 'day_55'
 * @returns {Promise<Object>} Processing results
 */
async function processMilestone(milestone) {
  console.log(`[Pilot Conversion] Processing ${milestone}...`);
  
  const results = {
    milestone,
    processed: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    errors: []
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
        results.errors.push({ agent: agent.email, error: result.error });
      }
    }

    console.log(`[Pilot Conversion] ${milestone} complete: ${results.sent} sent, ${results.skipped} skipped, ${results.failed} failed`);
    return results;

  } catch (error) {
    console.error(`[Pilot Conversion] Error processing ${milestone}:`, error);
    results.errors.push({ error: error.message });
    return results;
  }
}

/**
 * Run the full conversion sequence check
 * Checks all milestones and sends appropriate emails
 * @returns {Promise<Object>} Results for all milestones
 */
async function runConversionSequence() {
  console.log('[Pilot Conversion] Starting conversion sequence check...');
  
  const results = {
    timestamp: new Date().toISOString(),
    milestones: {}
  };

  // Process each milestone
  for (const milestone of ['day_30', 'day_45', 'day_55']) {
    results.milestones[milestone] = await processMilestone(milestone);
  }

  console.log('[Pilot Conversion] Sequence check complete');
  return results;
}

module.exports = {
  runConversionSequence,
  processMilestone,
  sendConversionEmail,
  getEligibleAgents,
  getAgentStats,
  hasAgentUpgraded,
  isSupabaseConfigured,
  isResendConfigured,
  MILESTONES
};
