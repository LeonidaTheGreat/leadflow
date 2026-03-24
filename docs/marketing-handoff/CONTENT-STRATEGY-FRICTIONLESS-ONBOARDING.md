# Marketing Content Strategy: Frictionless Onboarding Flow

**Use Case:** feat-frictionless-onboarding-flow  
**PRD:** PRD-FRICTIONLESS-ONBOARDING-001  
**Handoff Date:** 2026-03-11  
**Status:** Ready for Design/Dev

---

## Executive Summary

This document provides all marketing copy, messaging frameworks, and content requirements for the Self-Serve Frictionless Onboarding Flow. The goal is to reduce time-to-value from signup to first AI response to under 2 minutes, with zero credit card friction.

**Key Messaging Pillars:**
1. **Speed** — "Up and running in 60 seconds"
2. **Zero Friction** — "No credit card required"
3. **Immediate Value** — "See your first AI response in under 2 minutes"
4. **Proof** — "78% of deals go to the first agent to respond"

---

## 1. Landing Page Copy

### 1.1 Hero Section

**Headline (H1):**
```
Never Lose Another Lead to Slow Response
```

**Sub-headline:**
```
LeadFlow AI responds to your real estate leads in under 30 seconds—while you're showing houses, with clients, or sleeping.
```

**Primary CTA Button:**
```
Start Free Trial — No Credit Card
```

**CTA Micro-copy (below button):**
```
⚡ 14-day free trial • Up and running in 60 seconds • Cancel anytime
```

**Supporting Stat (optional badge):**
```
78% of real estate deals go to the first agent to respond
```

---

### 1.2 Trust Bar (below fold)

**Social Proof Line:**
```
Trusted by agents closing 200+ deals per year
```

**Trust Signals:**
- 🔒 SSL Secured
- ✓ No credit card required
- ✓ Cancel anytime
- ✓ Works with Follow Up Boss

---

### 1.3 Feature Section CTAs

**For "Instant AI Response" feature:**
```
Your leads get answered in 30 seconds—even at 2 AM.
```

**For "FUB Integration" feature:**
```
Works with the CRM you already use. No migration. No learning curve.
```

**For "SMS-First" feature:**
```
98% of SMS messages get read. Your leads actually see your response.
```

---

### 1.4 Pricing Section CTA

**Trial Callout Box:**
```
Not sure? Try everything free for 14 days.
No credit card. No setup fees. No catch.

[Start Free Trial]
```

---

### 1.5 Exit Intent / Sticky Footer

**Copy:**
```
Start your free trial — 14 days, no credit card required
```

---

## 2. Signup Page Copy (`/signup/trial`)

### 2.1 Page Header

**Headline:**
```
Start Your Free Trial
```

**Sub-headline:**
```
14 days free. No credit card required.
```

### 2.2 Form Labels

**Email Field:**
- Label: `Email address`
- Placeholder: `you@example.com`

**Password Field:**
- Label: `Password`
- Placeholder: `Create a password (8+ characters)`
- Helper: `Must be at least 8 characters`

### 2.3 Submit Button States

**Default:**
```
Create Account →
```

**Loading:**
```
Creating your account...
```

**Success:**
```
Success! Redirecting to dashboard...
```

### 2.4 Error Messages

**Duplicate Email:**
```
This email is already registered. Sign in here →
```

**Weak Password:**
```
Password must be at least 8 characters
```

**Network Error:**
```
Something went wrong. Please try again.
```

### 2.5 Footer Elements

**Sign-in Link:**
```
Already have an account? Sign in
```

**Trust Footer:**
```
🔒 SSL secured • No CC required • Cancel anytime
```

---

## 3. Welcome Email Sequence

### 3.1 Welcome Email (Sent immediately after signup)

**Subject Line:**
```
Welcome to LeadFlow AI — Your trial starts now ⚡
```

**Preview Text:**
```
You're 2 minutes away from your first AI-powered lead response
```

**Body (HTML):**
```html
<h1>Hey,</h1>

<p>You're in. LeadFlow AI is ready to respond to your leads in under 30 seconds.</p>

<h2>Here's what to do next:</h2>
<ol>
  <li><strong>Connect your Follow Up Boss account</strong> (takes 2 minutes)</li>
  <li><strong>Verify your SMS number</strong></li>
  <li><strong>Watch AI respond to a simulated lead live</strong></li>
</ol>

<p><a href="{{dashboard_url}}" style="...">Open your dashboard →</a></p>

<p>Your 14-day trial is active. No credit card needed until you decide to upgrade.</p>

<p>Questions? Just reply to this email.</p>

<p>— The LeadFlow Team</p>
```

**Body (Plain Text):**
```
Hey,

You're in. LeadFlow AI is ready to respond to your leads in under 30 seconds.

Here's what to do next:
1. Connect your Follow Up Boss account (takes 2 min)
2. Verify your SMS number
3. Watch AI respond to a simulated lead live

Open your dashboard: {{dashboard_url}}

Your 14-day trial is active. No credit card needed until you decide to upgrade.

Questions? Reply to this email.

— The LeadFlow Team
```

---

### 3.2 Day 3: Activation Nudge

**Subject:**
```
Your leads are waiting — complete setup in 2 minutes
```

**Body:**
```
Hi there,

You started your LeadFlow trial 3 days ago, but we noticed you haven't connected Follow Up Boss yet.

Here's what you're missing:
• AI responses to your Zillow and Realtor.com leads
• 24/7 instant replies while you're with clients
• More appointments booked on autopilot

[Complete Setup →]

It takes 2 minutes. No technical skills needed.

— The LeadFlow Team
```

---

### 3.3 Day 7: Mid-Trial Value Check

**Subject:**
```
Halfway through your trial — here's what LeadFlow can do
```

**Body:**
```
Hi {{first_name|there}},

You're 7 days into your LeadFlow trial. Here's what agents like you are seeing:

✓ 30-second average response time (vs. 4+ hours industry average)
✓ 3x more appointments booked from existing leads
✓ Zero leads slipping through the cracks

{{#if fub_connected}}
You're all set up! Check your dashboard to see LeadFlow in action.
{{else}}
Don't leave money on the table. Complete your setup in 2 minutes:
[Connect FUB →]
{{/if}}

— The LeadFlow Team
```

---

### 3.4 Day 10: Expiry Warning (4 days left)

**Subject:**
```
Your LeadFlow trial ends in 4 days
```

**Body:**
```
Hi {{first_name|there}},

Your 14-day free trial ends in 4 days.

{{#if leads_responded}}
So far, LeadFlow has responded to {{leads_responded}} of your leads in under 30 seconds.
{{else}}
Don't let your leads go unanswered. Agents who respond first win 78% of deals.
{{/if}}

To keep your AI assistant running:
[Upgrade to Pro →]

Questions about plans? Just reply to this email.

— The LeadFlow Team
```

---

### 3.5 Day 13: Final Day Warning

**Subject:**
```
Last day to keep your AI running 🚨
```

**Body:**
```
Hi {{first_name|there}},

Tomorrow, your LeadFlow trial ends.

That means:
• Your AI will stop responding to new leads
• Your leads will go back to waiting hours (or never hearing back)
• Your competitors will keep winning the deals you could have had

Don't let that happen.

[Upgrade Now — Keep Your AI Running →]

It takes 30 seconds. No setup required.

— The LeadFlow Team
```

---

### 3.6 Day 14: Trial Expired

**Subject:**
```
Your LeadFlow trial has ended
```

**Body:**
```
Hi {{first_name|there}},

Your 14-day LeadFlow trial has ended.

What this means:
• SMS responses are paused
• New leads won't get AI replies
• Your data is preserved — nothing is deleted

The good news? You can reactivate in 30 seconds:
[Resume Access →]

Questions? Reply to this email and we'll help.

— The LeadFlow Team
```

---

## 4. In-App Copy

### 4.1 Trial Countdown Banner

**Days 1–10:**
```
⏱ {{days_remaining}} days left in your free trial — Upgrade to keep your leads flowing
```

**Days 11–13:**
```
⚠️ {{days_remaining}} days left — don't let your leads go dark
```

**Day 14:**
```
🔴 Trial ending today — upgrade to keep responding
```

**CTA Button:** `Upgrade Now`

---

### 4.2 Sample Leads Banner

**First Dashboard Visit:**
```
These are sample leads to show you how LeadFlow works. Connect FUB to see your real leads.
```

**Dismiss Button:** `Got it`

---

### 4.3 Wizard Copy

#### Step 1: Connect FUB

**Title:**
```
Connect Follow Up Boss
```

**Description:**
```
LeadFlow works with your existing CRM. Enter your FUB API key to sync your leads.
```

**Input Label:**
```
FUB API Key
```

**Input Placeholder:**
```
paste-your-api-key-here
```

**Primary CTA:**
```
Connect FUB
```

**Help Link:**
```
Where do I find my FUB API key?
```

**Help Tooltip Content:**
```
1. Log into Follow Up Boss
2. Go to Admin → API
3. Copy your API key
4. Paste it here
```

**Success State:**
```
✓ Connected — {{lead_count}} leads synced
```

**Error States:**

Invalid key:
```
That API key didn't work. Find it in FUB → Admin → API
```

FUB unreachable:
```
FUB is temporarily unavailable — try again in a moment
```

**Skip Option:**
```
Skip for now →
```

---

#### Step 2: Verify SMS

**Title:**
```
Verify Your Phone Number
```

**Description:**
```
We'll send you a test SMS to confirm everything is working. This is the number your leads will see.
```

**Input Label:**
```
Your mobile number
```

**Input Placeholder:**
```
+1 (555) 123-4567
```

**Primary CTA (Initial):**
```
Send Test SMS
```

**Primary CTA (After Send):**
```
Verify Code
```

**Confirmation Input Label:**
```
Enter 4-digit code
```

**Test SMS Content:**
```
LeadFlow AI is connected ✓ Reply READY to confirm.
```

**Success State:**
```
✓ SMS verified — you're ready to respond to leads
```

**Skip Option:**
```
Skip for now →
```

**Skip Note:**
```
If skipped, LeadFlow will use a demo number for the simulator. Real SMS requires completion.
```

---

#### Step 3: Aha Moment Simulator

**Title:**
```
See LeadFlow in Action
```

**Description:**
```
Watch AI respond to your first lead in real-time.
```

**Incoming Lead Bubble:**
```
Hi, I saw your listing on Zillow. Is it still available?
```

**Lead Name:**
```
Sarah M. (Zillow Lead)
```

**AI Typing Indicator:**
```
AI is generating response...
```

**AI Response (Sample):**
```
Hi Sarah! Yes, that listing is still available. I'd love to show it to you — are you free this Saturday afternoon?
```

**Success State:**
```
✓ Your first lead was responded to in {{response_time}}s ⚡
```

**Success Sub-text:**
```
That's 99% faster than the industry average.
```

**Primary CTA (Success):**
```
Go to Dashboard →
```

**Failure State:**
```
Simulator timed out — your system is still ready
```

**Failure Sub-text:**
```
This was just a demo. Your real AI is configured and ready.
```

**Failure CTA:**
```
Continue to Dashboard →
```

---

### 4.4 Wizard Navigation

**Step Indicator:**
```
Step {{current_step}} of 3
```

**Progress Labels:**
1. Connect FUB
2. Verify SMS
3. See It Work

---

## 5. Content Requirements for Design/Dev

### 5.1 Character Limits

| Element | Max Length | Notes |
|---------|------------|-------|
| Headlines (H1) | 60 chars | Keep punchy |
| Sub-headlines | 120 chars | One sentence |
| CTA Buttons | 30 chars | Action-oriented |
| Error messages | 100 chars | Clear + actionable |
| Email subject | 50 chars | Mobile-optimized |
| SMS messages | 160 chars | Single segment |

### 5.2 Tone & Voice Guidelines

**DO:**
- Use active voice
- Lead with benefits, not features
- Be specific ("30 seconds" not "fast")
- Sound confident but not arrogant
- Use contractions (you're, don't, can't)

**DON'T:**
- Use jargon without explanation
- Be overly formal or stiff
- Make promises we can't keep
- Use all caps for emphasis
- Exceed 2 sentences per paragraph in emails

### 5.3 Emoji Usage

**Approved emojis:**
- ⚡ Speed/energy
- ✓ Checkmarks/success
- ⏱ Time/countdown
- 🔒 Security
- 🚨 Urgency (sparingly)
- 💡 Tips/insights

**Avoid:**
- Overusing emojis (max 1 per headline, 2 per email)
- Random decorative emojis
- Emojis in error messages

### 5.4 Accessibility Requirements

- All buttons must have descriptive text (not just "Click here")
- Error messages must be color-independent (icon + text)
- Form labels must be associated with inputs
- Skip links must be keyboard-accessible
- Success states must be announced to screen readers

---

## 6. Analytics Event Labels

For GA4 tracking, use these exact event names:

| Event | Trigger |
|-------|---------|
| `trial_signup_start` | CTA click on landing page |
| `trial_signup_complete` | Account created |
| `wizard_opened` | Wizard overlay appears |
| `wizard_step_1_complete` | FUB connected |
| `wizard_step_1_skipped` | FUB step skipped |
| `wizard_step_2_complete` | SMS verified |
| `wizard_step_2_skipped` | SMS step skipped |
| `wizard_step_3_complete` | Aha simulator complete |
| `wizard_step_3_skipped` | Simulator skipped |
| `wizard_completed` | All 3 steps done |
| `aha_moment_achieved` | AI response rendered in <15s |

---

## 7. A/B Testing Candidates

**Priority 1 (test first):**
1. Hero headline: "Never Lose Another Lead" vs "Respond to Leads in 30 Seconds"
2. CTA button: "Start Free Trial" vs "Try It Free" vs "Get Started Free"
3. Sub-headline: With stat vs without stat

**Priority 2:**
1. Trial length mention: "14-day" vs "2-week"
2. Trust bar placement: Above fold vs below fold
3. Wizard step order: FUB first vs SMS first

---

## 8. Localization Notes

**For future internationalization:**

- Use full text, avoid concatenation: `"{{days}} days left"` not `"{{days}}" + " days left"`
- Avoid idioms: "slipping through the cracks" → "being missed"
- Use universal date formats: "14 days" not "2 weeks" (clearer globally)
- Currency: Store as cents, display with locale
- Phone numbers: Always show country code format

---

## 9. Deliverables Checklist

- [x] Landing page hero copy
- [x] Landing page CTA variations
- [x] Signup page copy
- [x] Form labels and error messages
- [x] Welcome email (immediate)
- [x] Day 3 activation nudge email
- [x] Day 7 mid-trial email
- [x] Day 10 expiry warning email
- [x] Day 13 final warning email
- [x] Day 14 expiry email
- [x] In-app trial countdown banners
- [x] Sample leads banner copy
- [x] Wizard step copy (all 3 steps)
- [x] Success/error state messages
- [x] Tone & voice guidelines
- [x] Analytics event labels
- [x] A/B testing candidates

---

## 10. Handoff Notes

**To Design Team:**
- All copy is final and approved for implementation
- Character limits are recommendations, not strict — adjust for visual balance
- Error states need visual distinction (color + icon)
- Success states should feel celebratory (this is a big moment for users)

**To Dev Team:**
- All email copy is ready for Resend templates
- Use dynamic variables exactly as shown ({{variable_name}})
- Event names must match exactly for analytics consistency
- SMS content must stay under 160 chars (single segment)

**Questions?**
Contact: Marketing Lead (via project channel)

---

*Document Version: 1.0*  
*Last Updated: 2026-03-11*  
*Next Review: Post-launch (2 weeks)*
