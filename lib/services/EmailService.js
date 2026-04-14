'use strict';

const { getRequestId } = require('../request-context');

class EmailService {
  constructor(options = {}) {
    const resolvedApiKey = options.apiKey || process.env.RESEND_API_KEY;
    this.apiKey = typeof resolvedApiKey === 'string' ? resolvedApiKey.trim() : resolvedApiKey;
    this.fromEmail = (options.fromEmail || process.env.FROM_EMAIL || 'stojan@leadflow.ai').trim();
    this.fromName = options.fromName || 'LeadFlow';
    this.fetchImpl = options.fetchImpl || null;
  }

  isConfigured() {
    return !!this.apiKey;
  }

  async send(params) {
    const {
      to,
      subject,
      html,
      text,
      from,
      tags,
      clickTracking,
      failIfUnconfigured = true,
      requestId
    } = params;

    if (!this.isConfigured()) {
      if (failIfUnconfigured) {
        return { success: false, error: 'RESEND_API_KEY not configured' };
      }
      return { success: true, mock: true, id: `mock_${Date.now()}` };
    }

    try {
      const fetch = await this.getFetch();
      const payload = {
        from: from || `${this.fromName} <${this.fromEmail}>`,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      };

      if (text) payload.text = text;
      if (Array.isArray(tags) && tags.length > 0) payload.tags = tags;
      if (typeof clickTracking === 'boolean') payload.click_tracking = clickTracking;

      const reqId = requestId || getRequestId();
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'X-Request-ID': reqId,
        },
        body: JSON.stringify(payload),
      });

      let body = null;
      try {
        body = await response.json();
      } catch (_) {
        body = null;
      }

      if (!response.ok) {
        const errorMessage = (body && body.message) || `Resend API ${response.status}`;
        return { success: false, error: errorMessage };
      }

      return { success: true, resend_id: body && body.id, id: body && body.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async sendVerification(params) {
    const { to, subject, html, from } = params;
    return this.send({
      to,
      subject,
      html,
      from: from || `LeadFlow AI <${this.fromEmail}>`,
      failIfUnconfigured: false,
      clickTracking: false,
    });
  }

  async sendPilotConversion(params) {
    const { to, subject, html, text } = params;
    return this.send({
      to,
      subject,
      html,
      text,
      tags: [{ name: 'campaign', value: 'pilot-conversion' }],
      failIfUnconfigured: false,
    });
  }

  async sendActivationOutreach(params) {
    const { to, subject, firstName, from, appUrl } = params;
    const resolvedAppUrl = appUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-five.vercel.app';
    const onboardingUrl = `${resolvedAppUrl}/dashboard/onboarding`;

    const html = this.buildActivationOutreachHtml(firstName, onboardingUrl);

    return this.send({
      to,
      subject,
      html,
      from: from || `Stojan from LeadFlow <${this.fromEmail}>`,
      failIfUnconfigured: true,
    });
  }

  buildActivationOutreachHtml(firstName, onboardingUrl) {
    const name = firstName || 'there';
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 560px; margin: 0 auto; padding: 20px; background: #f9fafb;">
  <div style="background: #ffffff; border-radius: 8px; padding: 40px 28px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <p style="font-size: 17px; color: #1f2937; margin: 0 0 16px;">Hi ${name},</p>

    <p style="font-size: 15px; color: #4b5563; margin: 0 0 12px;">
      I'm Stojan, the founder of LeadFlow AI. I noticed you signed up but haven't had a chance to see your first AI lead response yet.
    </p>

    <p style="font-size: 15px; color: #4b5563; margin: 0 0 12px;">
      It takes about 2 minutes to connect your CRM and then LeadFlow responds to every new lead in under 30 seconds, 24/7.
    </p>

    <p style="font-size: 15px; color: #4b5563; margin: 0 0 24px;">
      I'd love to help you get set up. Click below to pick up where you left off:
    </p>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${onboardingUrl}"
         style="display: inline-block; background: #10b981; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Complete Setup (2 min) &rarr;
      </a>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin: 24px 0 0;">
      If you have any questions, just reply to this email, it comes straight to me.
    </p>

    <p style="font-size: 14px; color: #4b5563; margin: 16px 0 0;">
      Stojan<br>
      <span style="color: #6b7280;">Founder, LeadFlow AI</span>
    </p>
  </div>
</body>
</html>`;
  }

  async getFetch() {
    if (this.fetchImpl) {
      return this.fetchImpl;
    }

    if (typeof fetch === 'function') {
      return fetch;
    }

    const module = await import('node-fetch');
    return module.default;
  }
}

module.exports = EmailService;
