// Resend API Integration for LeadFlow Pilot Email Sequence
// Provider: https://resend.com

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID || 'leadflow-pilot';

// Email configuration
const EMAIL_CONFIG = {
  from: 'LeadFlow Pilot Team <pilot@leadflow.ai>',
  replyTo: 'support@leadflow.ai',
  tags: {
    campaign: 'pilot-onboarding',
    category: 'pilot'
  }
};

/**
 * Send pilot onboarding email
 * @param {Object} agent - Agent object with personalization data
 * @param {string} emailId - Email identifier (welcome, day3_tips, etc.)
 * @param {string} variant - A/B test variant (A or B)
 */
export async function sendPilotEmail(agent, emailId, variant = 'A') {
  const email = getEmailTemplate(emailId, variant);
  const personalized = personalizeEmail(email, agent);
  
  try {
    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: agent.email,
      subject: personalized.subject,
      html: personalized.html,
      text: personalized.plainText,
      replyTo: EMAIL_CONFIG.replyTo,
      tags: [
        { name: 'campaign', value: EMAIL_CONFIG.tags.campaign },
        { name: 'email_id', value: emailId },
        { name: 'variant', value: variant },
        { name: 'agent_id', value: agent.id }
      ]
    });
    
    // Log for analytics
    await logEmailSent(agent.id, emailId, variant, result.id);
    
    return { success: true, messageId: result.id };
  } catch (error) {
    console.error(`Failed to send ${emailId} to ${agent.email}:`, error);
    await logEmailError(agent.id, emailId, error);
    throw error;
  }
}

/**
 * Get email template by ID and variant
 */
function getEmailTemplate(emailId, variant) {
  const templates = {
    welcome: {
      A: { subject: 'Welcome to LeadFlow Pilot, {{firstName}}! 🚀', template: 'welcome' },
      B: { subject: '{{firstName}}, your LeadFlow pilot access is ready', template: 'welcome' }
    },
    day3_tips: {
      A: { subject: 'Pro tips for your first week with LeadFlow', template: 'day3_tips' },
      B: { subject: '{{firstName}}, here\'s what top agents do first', template: 'day3_tips' }
    },
    week1_checkin: {
      A: { subject: 'How\'s your first week going, {{firstName}}?', template: 'week1_checkin' },
      B: { subject: 'Week 1 check-in + quick wins from other agents', template: 'week1_checkin' }
    },
    mid_pilot_feedback: {
      A: { subject: 'Quick feedback: {{firstName}}, how are we doing?', template: 'mid_pilot_feedback' },
      B: { subject: 'Mid-pilot check: 2 minutes, huge impact', template: 'mid_pilot_feedback' }
    },
    completion: {
      A: { subject: '{{firstName}}, your pilot completion + next steps', template: 'completion' },
      B: { subject: 'Pilot complete! Here\'s what happens next 🎉', template: 'completion' }
    }
  };
  
  return templates[emailId]?.[variant] || templates[emailId]?.A;
}

/**
 * Personalize email with agent data
 */
function personalizeEmail(email, agent) {
  const tokens = {
    '{{firstName}}': agent.firstName,
    '{{fullName}}': agent.fullName,
    '{{brokerage}}': agent.brokerage,
    '{{startDate}}': formatDate(agent.pilotStartDate),
    '{{dashboardUrl}}': agent.dashboardUrl,
    '{{calendarLink}}': agent.onboardingCalendarLink
  };
  
  let subject = email.subject;
  let html = loadHtmlTemplate(email.template);
  let plainText = loadPlainTextTemplate(email.template);
  
  // Replace all tokens
  for (const [token, value] of Object.entries(tokens)) {
    const regex = new RegExp(token, 'g');
    subject = subject.replace(regex, value);
    html = html.replace(regex, value);
    plainText = plainText.replace(regex, value);
  }
  
  return { subject, html, plainText };
}

/**
 * Format date for display
 */
function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Add or update contact in Resend audience
 */
export async function syncContact(agent) {
  try {
    await resend.contacts.create({
      audienceId: AUDIENCE_ID,
      email: agent.email,
      firstName: agent.firstName,
      lastName: agent.lastName,
      unsubscribed: false,
      data: {
        brokerage: agent.brokerage,
        pilotStartDate: agent.pilotStartDate,
        agentId: agent.id
      }
    });
    return { success: true };
  } catch (error) {
    // Contact may already exist, try update
    try {
      await resend.contacts.update({
        audienceId: AUDIENCE_ID,
        id: agent.email,
        data: {
          brokerage: agent.brokerage,
          pilotStartDate: agent.pilotStartDate
        }
      });
      return { success: true, updated: true };
    } catch (updateError) {
      console.error('Failed to sync contact:', updateError);
      throw updateError;
    }
  }
}

/**
 * Get A/B test variant for agent (deterministic)
 */
export function getVariantForAgent(agentId) {
  // Simple hash-based assignment for consistency
  const hash = agentId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  return Math.abs(hash) % 2 === 0 ? 'A' : 'B';
}

// Analytics logging (integrate with your analytics)
async function logEmailSent(agentId, emailId, variant, messageId) {
  // Implementation depends on your analytics stack
  console.log(`[EMAIL SENT] ${emailId} (${variant}) to ${agentId}, msg: ${messageId}`);
}

async function logEmailError(agentId, emailId, error) {
  console.error(`[EMAIL ERROR] ${emailId} to ${agentId}:`, error.message);
}

// Load template functions (would import actual templates)
function loadHtmlTemplate(name) {
  // In production, load from file or database
  return `<!-- ${name} HTML template -->`;
}

function loadPlainTextTemplate(name) {
  // In production, load from file or database  
  return `<!-- ${name} plain text template -->`;
}

export default {
  sendPilotEmail,
  syncContact,
  getVariantForAgent
};
