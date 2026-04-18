'use strict';

function buildTrialCTAEmail(agentName, appUrl, demoUrl) {
  const firstName = agentName ? agentName.split(' ')[0] : 'there';
  const resolvedAppUrl = appUrl || 'https://leadflow-ai-five.vercel.app';
  const resolvedDemoUrl = demoUrl || `${resolvedAppUrl}/demo`;
  const dashboardUrl = `${resolvedAppUrl}/dashboard`;

  const subject = `Here's your AI lead response dashboard — ready to try it?`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 560px; margin: 0 auto; padding: 20px; background: #f9fafb;">
  <div style="background: #ffffff; border-radius: 8px; padding: 40px 28px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <p style="font-size: 17px; color: #1f2937; margin: 0 0 16px;">Hi ${firstName},</p>

    <p style="font-size: 15px; color: #4b5563; margin: 0 0 12px;">
      Welcome to your LeadFlow AI trial! Your dashboard is ready and includes a sample lead interaction so you can see exactly how the AI responds to real prospects.
    </p>

    <p style="font-size: 15px; color: #4b5563; margin: 0 0 12px;">
      <strong>Here's what to expect in the next 30 days:</strong>
    </p>

    <ul style="font-size: 15px; color: #4b5563; margin: 0 0 24px; padding-left: 20px;">
      <li style="margin-bottom: 8px;"><strong>Days 1-5:</strong> Explore your dashboard and test the simulator</li>
      <li style="margin-bottom: 8px;"><strong>Days 5-15:</strong> Connect your Follow Up Boss CRM to start receiving real leads</li>
      <li style="margin-bottom: 8px;"><strong>Days 15-30:</strong> Watch AI handle your leads 24/7 while you focus on conversion</li>
    </ul>

    <div style="background: #f3f4f6; padding: 20px; border-radius: 6px; margin: 24px 0;">
      <p style="font-size: 14px; color: #374151; margin: 0 0 12px; font-weight: 600;">Quick start:</p>
      <div style="margin-bottom: 12px;">
        <a href="${dashboardUrl}" style="display: inline-block; background: #10b981; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
          Go to Dashboard &rarr;
        </a>
      </div>
      <p style="font-size: 14px; color: #6b7280; margin: 0;">
        Already familiar with LeadFlow? Try the <a href="${resolvedDemoUrl}" style="color: #10b981; text-decoration: none;">interactive demo</a> to see the AI in action.
      </p>
    </div>

    <p style="font-size: 15px; color: #4b5563; margin: 24px 0 0;">
      Questions? Just reply to this email — I read every one.
    </p>

    <p style="font-size: 14px; color: #4b5563; margin: 16px 0 0;">
      Stojan<br>
      <span style="color: #6b7280;">Founder, LeadFlow AI</span>
    </p>
  </div>
</body>
</html>`;

  const text = `Hi ${firstName},

Welcome to your LeadFlow AI trial! Your dashboard is ready and includes a sample lead interaction so you can see exactly how the AI responds to real prospects.

Here's what to expect in the next 30 days:

Days 1-5: Explore your dashboard and test the simulator
Days 5-15: Connect your Follow Up Boss CRM to start receiving real leads
Days 15-30: Watch AI handle your leads 24/7 while you focus on conversion

Go to Dashboard: ${dashboardUrl}
Try the demo: ${resolvedDemoUrl}

Questions? Just reply to this email — I read every one.

Stojan
Founder, LeadFlow AI`;

  return { subject, html, text };
}

module.exports = { buildTrialCTAEmail };
