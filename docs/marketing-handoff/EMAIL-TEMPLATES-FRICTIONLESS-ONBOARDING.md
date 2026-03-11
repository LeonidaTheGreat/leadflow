# Email Templates: Frictionless Onboarding Flow

**Use Case:** feat-frictionless-onboarding-flow  
**Platform:** Resend  
**Format:** HTML + Plain Text

---

## Template 1: Welcome Email

**Template ID:** `welcome-trial-start`  
**Trigger:** Immediately after signup  
**Subject:** Welcome to LeadFlow AI — Your trial starts now ⚡

### HTML Version

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to LeadFlow AI</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f9fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px;">
              <h1 style="margin: 0; font-size: 28px; color: #1a1a1a; font-weight: 700;">You're in. ⚡</h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 0 40px 20px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                LeadFlow AI is ready to respond to your leads in under 30 seconds.
              </p>
              
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                <strong>Here's what to do next:</strong>
              </p>
              
              <ol style="margin: 0 0 25px; padding-left: 20px; font-size: 16px; line-height: 1.8; color: #4a4a4a;">
                <li>Connect your Follow Up Boss account (takes 2 minutes)</li>
                <li>Verify your SMS number</li>
                <li>Watch AI respond to a simulated lead live</li>
              </ol>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="{{dashboard_url}}?utm_source=email&utm_campaign=welcome" 
                       style="display: inline-block; padding: 16px 32px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
                      Open Your Dashboard →
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #6a6a6a;">
                Your 14-day trial is active. No credit card needed until you decide to upgrade.
              </p>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <hr style="border: none; border-top: 1px solid #e9ecef; margin: 20px 0;">
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <p style="margin: 0 0 10px; font-size: 14px; color: #6a6a6a;">
                Questions? Just reply to this email.
              </p>
              <p style="margin: 0; font-size: 14px; color: #6a6a6a;">
                — The LeadFlow Team
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Footer Links -->
        <table width="600" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding: 20px; font-size: 12px; color: #9a9a9a;">
              <p style="margin: 0;">
                LeadFlow AI • Real Estate Lead Response
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

### Plain Text Version

```
You're in. ⚡

LeadFlow AI is ready to respond to your leads in under 30 seconds.

Here's what to do next:
1. Connect your Follow Up Boss account (takes 2 minutes)
2. Verify your SMS number
3. Watch AI respond to a simulated lead live

Open your dashboard: {{dashboard_url}}

Your 14-day trial is active. No credit card needed until you decide to upgrade.

Questions? Just reply to this email.

— The LeadFlow Team

---
LeadFlow AI • Real Estate Lead Response
```

### Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{dashboard_url}}` | User's dashboard URL | `https://leadflow-ai-five.vercel.app/dashboard` |

---

## Template 2: Day 3 Activation Nudge

**Template ID:** `activation-nudge-day-3`  
**Trigger:** 3 days after signup if FUB not connected  
**Subject:** Your leads are waiting — complete setup in 2 minutes

### HTML Version

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complete Your Setup</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f9fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 40px 20px;">
              <h1 style="margin: 0; font-size: 24px; color: #1a1a1a;">Your leads are waiting</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 20px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                You started your LeadFlow trial 3 days ago, but we noticed you haven't connected Follow Up Boss yet.
              </p>
              
              <p style="margin: 0 0 15px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                <strong>Here's what you're missing:</strong>
              </p>
              
              <ul style="margin: 0 0 25px; padding-left: 20px; font-size: 16px; line-height: 1.8; color: #4a4a4a;">
                <li>AI responses to your Zillow and Realtor.com leads</li>
                <li>24/7 instant replies while you're with clients</li>
                <li>More appointments booked on autopilot</li>
              </ul>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="{{dashboard_url}}?utm_source=email&utm_campaign=activation-nudge" 
                       style="display: inline-block; padding: 16px 32px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
                      Complete Setup →
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #6a6a6a;">
                It takes 2 minutes. No technical skills needed.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px 40px;">
              <p style="margin: 0; font-size: 14px; color: #6a6a6a;">— The LeadFlow Team</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

### Plain Text Version

```
Your leads are waiting

You started your LeadFlow trial 3 days ago, but we noticed you haven't connected Follow Up Boss yet.

Here's what you're missing:
• AI responses to your Zillow and Realtor.com leads
• 24/7 instant replies while you're with clients
• More appointments booked on autopilot

Complete setup: {{dashboard_url}}

It takes 2 minutes. No technical skills needed.

— The LeadFlow Team
```

---

## Template 3: Day 7 Mid-Trial Check

**Template ID:** `mid-trial-day-7`  
**Trigger:** 7 days after signup  
**Subject:** Halfway through your trial — here's what LeadFlow can do

### HTML Version

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Halfway Through Your Trial</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f9fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 40px 20px;">
              <h1 style="margin: 0; font-size: 24px; color: #1a1a1a;">You're 7 days in</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 20px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                You're halfway through your LeadFlow trial. Here's what agents like you are seeing:
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; background-color: #f8f9fa; border-radius: 6px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 10px; font-size: 16px; color: #4a4a4a;">✓ 30-second average response time</p>
                    <p style="margin: 0 0 10px; font-size: 16px; color: #4a4a4a;">✓ 3x more appointments booked</p>
                    <p style="margin: 0; font-size: 16px; color: #4a4a4a;">✓ Zero leads slipping through the cracks</p>
                  </td>
                </tr>
              </table>
              
              {{#if fub_connected}}
              <p style="margin: 25px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                You're all set up! Check your dashboard to see LeadFlow in action.
              </p>
              {{else}}
              <p style="margin: 25px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                Don't leave money on the table. Complete your setup in 2 minutes.
              </p>
              {{/if}}
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="{{dashboard_url}}?utm_source=email&utm_campaign=mid-trial" 
                       style="display: inline-block; padding: 16px 32px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
                      {{#if fub_connected}}View Dashboard{{else}}Connect FUB →{{/if}}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px 40px;">
              <p style="margin: 0; font-size: 14px; color: #6a6a6a;">— The LeadFlow Team</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

### Variables

| Variable | Type | Description |
|----------|------|-------------|
| `{{fub_connected}}` | Boolean | Whether user has connected FUB |

---

## Template 4: Day 10 Expiry Warning

**Template ID:** `expiry-warning-day-10`  
**Trigger:** 10 days after signup (4 days remaining)  
**Subject:** Your LeadFlow trial ends in 4 days

### HTML Version

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Trial Ending Soon</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f9fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 40px 20px;">
              <h1 style="margin: 0; font-size: 24px; color: #1a1a1a;">Your trial ends in 4 days</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 20px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                Your 14-day free trial ends in 4 days.
              </p>
              
              {{#if leads_responded}}
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                So far, LeadFlow has responded to <strong>{{leads_responded}}</strong> of your leads in under 30 seconds.
              </p>
              {{else}}
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                Don't let your leads go unanswered. Agents who respond first win 78% of deals.
              </p>
              {{/if}}
              
              <p style="margin: 0 0 25px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                To keep your AI assistant running:
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="{{upgrade_url}}?utm_source=email&utm_campaign=expiry-warning" 
                       style="display: inline-block; padding: 16px 32px; background-color: #28a745; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
                      Upgrade to Pro →
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #6a6a6a;">
                Questions about plans? Just reply to this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px 40px;">
              <p style="margin: 0; font-size: 14px; color: #6a6a6a;">— The LeadFlow Team</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

### Variables

| Variable | Type | Description |
|----------|------|-------------|
| `{{leads_responded}}` | Number | Count of leads AI has responded to |
| `{{upgrade_url}}` | String | URL to upgrade/pricing page |

---

## Template 5: Day 13 Final Warning

**Template ID:** `final-warning-day-13`  
**Trigger:** 13 days after signup (1 day remaining)  
**Subject:** Last day to keep your AI running 🚨

### HTML Version

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Last Day of Trial</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f9fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-top: 4px solid #dc3545;">
          <tr>
            <td style="padding: 40px 40px 20px;">
              <h1 style="margin: 0; font-size: 24px; color: #1a1a1a;">Tomorrow, your trial ends 🚨</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 20px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                Tomorrow, your LeadFlow trial ends.
              </p>
              
              <p style="margin: 0 0 10px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                That means:
              </p>
              
              <ul style="margin: 0 0 25px; padding-left: 20px; font-size: 16px; line-height: 1.8; color: #dc3545;">
                <li>Your AI will stop responding to new leads</li>
                <li>Your leads will go back to waiting hours (or never hearing back)</li>
                <li>Your competitors will keep winning the deals you could have had</li>
              </ul>
              
              <p style="margin: 0 0 25px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                <strong>Don't let that happen.</strong>
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="{{upgrade_url}}?utm_source=email&utm_campaign=final-warning" 
                       style="display: inline-block; padding: 16px 32px; background-color: #dc3545; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
                      Upgrade Now — Keep Your AI Running →
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #6a6a6a;">
                It takes 30 seconds. No setup required.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px 40px;">
              <p style="margin: 0; font-size: 14px; color: #6a6a6a;">— The LeadFlow Team</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## Template 6: Day 14 Trial Expired

**Template ID:** `trial-expired-day-14`  
**Trigger:** 14 days after signup (trial ended)  
**Subject:** Your LeadFlow trial has ended

### HTML Version

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Trial Ended</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f9fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 40px 20px;">
              <h1 style="margin: 0; font-size: 24px; color: #1a1a1a;">Your trial has ended</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 20px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                Your 14-day LeadFlow trial has ended.
              </p>
              
              <p style="margin: 0 0 10px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                <strong>What this means:</strong>
              </p>
              
              <ul style="margin: 0 0 25px; padding-left: 20px; font-size: 16px; line-height: 1.8; color: #4a4a4a;">
                <li>SMS responses are paused</li>
                <li>New leads won't get AI replies</li>
                <li>Your data is preserved — nothing is deleted</li>
              </ul>
              
              <p style="margin: 0 0 25px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                The good news? You can reactivate in 30 seconds:
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="{{upgrade_url}}?utm_source=email&utm_campaign=trial-expired" 
                       style="display: inline-block; padding: 16px 32px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
                      Resume Access →
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #6a6a6a;">
                Questions? Reply to this email and we'll help.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px 40px;">
              <p style="margin: 0; font-size: 14px; color: #6a6a6a;">— The LeadFlow Team</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## Implementation Notes

### Resend Configuration

```javascript
// Example Resend API call for welcome email
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'LeadFlow AI <team@leadflow.ai>',
  to: user.email,
  subject: 'Welcome to LeadFlow AI — Your trial starts now ⚡',
  html: welcomeEmailHtml,
  text: welcomeEmailText,
  tags: [
    { name: 'campaign', value: 'welcome' },
    { name: 'user_type', value: 'trial' }
  ]
});
```

### Email Timing Schedule

| Day | Template | Condition |
|-----|----------|-----------|
| 0 | `welcome-trial-start` | All new signups |
| 3 | `activation-nudge-day-3` | FUB not connected |
| 7 | `mid-trial-day-7` | All trial users |
| 10 | `expiry-warning-day-10` | All trial users |
| 13 | `final-warning-day-13` | All trial users |
| 14 | `trial-expired-day-14` | Trial ended, not upgraded |

### Dynamic Content Rules

1. **Welcome email:** Always sent immediately
2. **Activation nudge:** Only if `onboarding_completed = false`
3. **Mid-trial:** Show different CTA based on `fub_connected` status
4. **Expiry emails:** Include `leads_responded` count if > 0
5. **Expired email:** Always include `upgrade_url` with trial_expired param

---

*Document Version: 1.0*  
*Last Updated: 2026-03-11*
