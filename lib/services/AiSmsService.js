'use strict';

const axios = require('axios');
const { logger: defaultLogger } = require('../logger');

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const MAX_SMS_CHARS = 320;

class AiSmsService {
  constructor(options = {}) {
    this.logger = options.logger || defaultLogger;
    this.apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY;
    this.model = options.model || DEFAULT_MODEL;
    this.axios = options.axios || axios;
  }

  buildSmsPrompt(lead, agent, options = {}) {
    const agentName = agent.name || 'Your Agent';
    const agentFirstName = agentName.split(' ')[0];
    const leadFirstName = lead.firstName || (lead.name && lead.name !== 'New Lead' ? lead.name.split(' ')[0] : null);
    const location = lead.location || lead.city || 'the area';
    const trigger = options.trigger || 'initial_response';

    const triggerGuidelines = {
      initial_response: `- This is the FIRST message to the lead\n- Introduce yourself by first name\n- Reference their interest/location if known\n- Ask ONE question to start the conversation\n- Keep it warm and casual`,
      appointment_confirmation: `- Confirm the appointment details\n- Be brief and enthusiastic\n- Include the time if available`,
      follow_up_after_showing: `- Reference the showing they attended\n- Ask for their thoughts\n- Be warm and non-pushy`,
      agent_intro: `- Introduce yourself as their new agent\n- Be warm and personal\n- Express enthusiasm about helping them`,
      no_show_follow_up: `- Be understanding, not accusatory\n- Offer to reschedule\n- Keep it short`,
      offer_acknowledgment: `- Acknowledge the offer stage\n- Be professional and supportive\n- Offer next-step guidance`
    };

    return `You are ${agentName}, a real estate agent texting a potential client. Write a single SMS message.

<agent_info>
Name: ${agentName}
First name: ${agentFirstName}
</agent_info>

<lead_info>
First name: ${leadFirstName || 'Unknown'}
Location: ${location}
${options.previousStatus ? `Previous status: ${options.previousStatus}` : ''}
${options.appointmentTime ? `Appointment time: ${options.appointmentTime}` : ''}
</lead_info>

<trigger>${trigger}</trigger>

<guidelines>
${triggerGuidelines[trigger] || triggerGuidelines.initial_response}
</guidelines>

<rules>
1. MAX ${MAX_SMS_CHARS} characters
2. Sound like a real person texting, not a robot
3. ${leadFirstName ? `Address them as "${leadFirstName}"` : 'Do NOT use a name - say "Hi there" or similar'}
4. Introduce yourself as "${agentFirstName}" (your first name only)
5. Do NOT use process.env or template variables
6. Do NOT include "Reply STOP to opt out" - that gets added automatically
7. No email-style signatures
8. ONE message only, no alternatives
</rules>

Write the SMS message text only. No quotes, no explanation, just the message.`;
  }

  async generateResponse(prompt) {
    const response = await this.axios.post(ANTHROPIC_API_URL, {
      model: this.model,
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }]
    }, {
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    const text = response.data?.content?.[0]?.text;
    if (!text) {
      throw new Error('Empty response from Anthropic API');
    }

    let message = text.trim().replace(/^["']|["']$/g, '');
    if (message.length > MAX_SMS_CHARS) {
      message = message.substring(0, MAX_SMS_CHARS - 3) + '...';
    }
    return message;
  }

  async generateAiSmsResponse(lead, options = {}) {
    const trigger = options.trigger || 'initial_response';

    const agent = this._resolveAgent(lead, options);

    if (!this.apiKey) {
      this.logger.warn('⚠️  No ANTHROPIC_API_KEY set, using fallback SMS');
      return this._fallbackResponse(lead, agent, trigger, options);
    }

    try {
      const prompt = this.buildSmsPrompt(lead, agent, { ...options, trigger });
      const message = await this.generateResponse(prompt);

      return {
        message,
        trigger,
        confidence: 0.9
      };
    } catch (error) {
      this.logger.error('❌ AI SMS generation failed, using fallback:', error.message);
      return this._fallbackResponse(lead, agent, trigger, options);
    }
  }

  _resolveAgent(lead, options) {
    if (options.agentName) {
      return { name: options.agentName };
    }
    if (lead.assignedTo?.name) {
      return { name: lead.assignedTo.name };
    }
    if (lead.assignedTo?.firstName) {
      return { name: `${lead.assignedTo.firstName} ${lead.assignedTo.lastName || ''}`.trim() };
    }
    return { name: process.env.AGENT_NAME || 'Your Agent' };
  }

  _fallbackResponse(lead, agent, trigger, options) {
    const agentFirstName = agent.name.split(' ')[0];
    const leadFirstName = lead.firstName || (lead.name ? lead.name.split(' ')[0] : 'there');
    const location = lead.location || lead.city || 'the area';

    const messages = {
      initial_response: `Hi ${leadFirstName}, I'm ${agentFirstName}. I saw you're interested in ${location} — I'd love to help! What kind of property are you looking for?`,
      appointment_confirmation: `Your showing is confirmed${options.appointmentTime ? ` for ${options.appointmentTime}` : ''}. See you then! - ${agentFirstName}`,
      follow_up_after_showing: `Hi ${leadFirstName}, it's ${agentFirstName}. How did you like the property? Happy to answer any questions.`,
      agent_intro: `Hi ${leadFirstName}, I'm ${agentFirstName} — I'll be your agent. Looking forward to helping you find the right place!`,
      no_show_follow_up: `Hi ${leadFirstName}, it's ${agentFirstName}. No worries about today — would you like to reschedule?`,
      offer_acknowledgment: `Hi ${leadFirstName}, ${agentFirstName} here. Exciting times! Let me know if you have any questions about the next steps.`
    };

    return {
      message: messages[trigger] || messages.initial_response,
      trigger,
      confidence: 0.7
    };
  }
}

module.exports = AiSmsService;
