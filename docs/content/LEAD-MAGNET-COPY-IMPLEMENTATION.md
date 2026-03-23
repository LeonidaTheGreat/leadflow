# Lead Magnet — Copy for Implementation

## Landing Page Email Capture Section

### Section Headline
```
Not ready to start? Get the free playbook.
```

### Subheadline
```
The 5-Minute AI Lead Response Playbook — how top agents never miss a lead
```

### Form Fields
| Field | Type | Placeholder | Required |
|-------|------|-------------|----------|
| Email | email | your@email.com | Yes |
| First Name | text | First name (optional) | No |

### CTA Button
```
Send Me the Playbook →
```

### Trust Line
```
No spam. Unsubscribe anytime. Delivered to your inbox in 60 seconds.
```

### Success Message
```
🎉 Check your inbox! We just sent your playbook.
```

### Error Messages
- Invalid email: `Please enter a valid email address.`
- Generic error: `Something went wrong. Please try again.`

---

## Email Sequence Copy

### Email 1: Playbook Delivery (Immediate)

**Subject:** `Your AI Lead Response Playbook is here 🏡`

**Preview:** `The 5-minute response templates inside →`

**Body (HTML/Text):**
```
Hi {{firstName|there}},

Your playbook is attached.

Inside, you'll find:
✓ The 5-minute response rule (and why it works)
✓ 4 proven response templates for different lead types
✓ The 7-touch follow-up sequence
✓ How top agents automate the whole thing

Download it here: [PDF LINK]

A quick favor: Once you've read it, hit reply and let me know 
which template you'll use first. I read every response.

Want to see how AI handles lead response automatically?
→ Try LeadFlow free: https://leadflow-ai-five.vercel.app

Talk soon,
[Name]
LeadFlow AI

P.S. — We're accepting 10 pilot agents this month. If you want 
AI responding to your leads in under 30 seconds, grab a spot 
before they're gone.
```

---

### Email 2: Social Proof Nudge (Day 3)

**Subject:** `What happens when you respond in 5 minutes vs. 5 hours`

**Preview:** `One number that changed how I think about lead response →`

**Body:**
```
Hi {{firstName|there}},

Quick question: How quickly do you respond to new leads right now?

Be honest. Check your phone. Look at your last 5 inquiries.

If the answer is "more than 5 minutes," this stat from MIT will 
haunt you:

"Responding within 5 minutes makes you 391% more likely to 
connect with a lead."

Not 39%. Not 91%. 391%.

Here's what that looks like in practice:

Agent A (5-minute response):
• 100 leads → 45 conversations → 12 appointments → 3 closings

Agent B (1-hour response):
• 100 leads → 15 conversations → 4 appointments → 1 closing

Same leads. Same market. Same skill.
Different response time. Different outcome.

The playbook I sent you has everything you need to hit that 
5-minute window consistently.

But if you want to remove the constraint entirely — if you want 
leads responded to in 30 seconds while you're sleeping, showing 
properties, or spending time with family — that's exactly what 
LeadFlow does.

See how it work: https://leadflow-ai-five.vercel.app

Best,
[Name]

P.S. — One of our pilot agents, Mike in Austin, went from 
responding in 2+ hours to under 30 seconds. His appointment 
bookings doubled in the first month. Just sayin'.
```

---

### Email 3: Pilot Offer / Urgency (Day 7)

**Subject:** `Pilot spots are filling up — here's your invite`

**Preview:** `{{firstName|there}}, want AI handling your lead response? →`

**Body:**
```
Hi {{firstName|there}},

I've been thinking about your lead response process.

You've got the playbook. You know the 5-minute rule. You 
understand the templates.

But here's the thing: Knowing isn't doing.

Even with the best intentions, life gets in the way:
• You're in a closing
• You're showing a property
• It's 10 PM and you're finally off the clock
• You're spending time with your family

Meanwhile, leads are inquiring. And waiting. And hiring someone else.

That's why I built LeadFlow.

AI that responds to your leads in under 30 seconds. 24/7. With 
human-like conversation. While you do literally anything else.

We're accepting 10 pilot agents this month.

As a pilot agent, you get:
✓ Free setup and onboarding
✓ 30 days of free service
✓ Direct access to me for feedback and tweaks
✓ Pricing locked at 50% off when we launch publicly

4 spots are already claimed.

Want one of the remaining 6?

→ Claim your pilot spot: https://leadflow-ai-five.vercel.app

Questions? Just reply to this email. I read every one.

Best,
[Name]
Founder, LeadFlow AI

P.S. — If LeadFlow isn't for you, no worries. Keep using the 
playbook — it works. But if you're tired of losing leads to 
slow response times, this is your shot to fix it permanently.
```

---

## Playbook PDF Content

See full content in: `LEAD-MAGNET-CONTENT-PACKAGE.md`

**Quick Stats for Design:**
- Title: "The 5-Minute AI Lead Response Playbook"
- Subtitle: "How Top Real Estate Agents Respond to Leads in Under 5 Minutes — and Convert 3x More"
- Length: ~8-10 pages
- Format: PDF, 8.5" x 11"

---

## Analytics Events (for Dev)

```javascript
// Section view
gtag('event', 'lead_magnet_view', {
  page_url: window.location.href,
  utm_source: getCookie('utm_source'),
  utm_medium: getCookie('utm_medium'),
  utm_campaign: getCookie('utm_campaign')
});

// Form submit attempt
gtag('event', 'lead_magnet_submit', {
  has_first_name: !!firstName
});

// Success
gtag('event', 'lead_magnet_success', {
  response_time_ms: Date.now() - submitStartTime
});

// Error
gtag('event', 'lead_magnet_error', {
  error_type: errorType // 'validation' | 'api'
});
```

---

## File Locations

| Asset | Path |
|-------|------|
| Full content package | `/docs/content/LEAD-MAGNET-CONTENT-PACKAGE.md` |
| This implementation brief | `/docs/content/LEAD-MAGNET-COPY-IMPLEMENTATION.md` |
| Playbook PDF (to be created) | `/docs/content/assets/lead-response-playbook.pdf` |
| Email templates (HTML) | `/docs/content/email-templates/` |

---

*Ready for Design & Development handoff*
