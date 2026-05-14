# Content Brief: 30-Pilot Campaign Recovery — Post-Stall Strategy
**Task:** fix-30-pilot-campaign-stalled-at-day-8  
**Date:** 2026-05-14  
**Author:** Marketing Agent  
**For:** Stojan (human action required) + Dev team  
**Urgency:** CRITICAL — Day 90 milestone (first paying customer) is 2026-05-15

---

## Situation Assessment

### What happened
The 30-pilot campaign (April 5 – May 5, 2026) ended with 0 agents contacted at Day 8.
Root cause: outreach was never executed because the necessary tooling (email blast endpoint,
personalized demo links, admin outreach UI) wasn't built before the human-action window closed.
No automation can fix that retroactively.

### Where we are now (May 14)
- Day 90 milestone (first paying customer) is **tomorrow** (2026-05-15)
- 35 `pilot_signups` exist in the DB — status unknown (mix of real and synthetic)
- 3 confirmed real agents per PMF audit
- $0 MRR, 0 paid subscribers
- Primary competitor (Mod Ai Automation) now listed on FUB Marketplace

### What marketing can and cannot do
**Cannot automate:** Direct 1:1 relationship outreach to real estate agents. This requires Stojan.  
**Can build:** Re-engagement email sequences, SMS nudges, personalized landing pages, conversion copy.

---

## Part 1: IMMEDIATE — Stojan's Personal Outreach Script (Today/Tomorrow)

**Channel:** Phone call or personal SMS — NOT email.  
Agents live on their phones. An email from an unknown founder competes with 200 others. A text or call from someone who knows their name does not.

**Target list (priority order):**
1. The 3 confirmed real agents in the DB — call first, they've already seen the product
2. Any `pilot_signups` whose email domain matches a known brokerage (real agents, not test data)
3. The 20 identified targets from `CONTENT-BRIEF-pilot-outreach-email-blast.md` — reach via text first

---

### Script A: Call/Text to an Existing Pilot Signup (agent has an account)

**Text version (send first, call if no reply in 2 hours):**

> Hi {First Name}, it's Stojan — I built LeadFlow. You signed up for the pilot a while back.
> 
> Quick question: have you had a chance to try the lead simulator? Takes 2 min and shows exactly what your leads would get in their first 30 seconds.
> 
> If you haven't set it up yet, I can walk you through it live — takes 10 minutes. Any chance you're free today or tomorrow?

**Call opening (if they answer):**

> "Hi {First Name}, this is Stojan, I'm the founder of LeadFlow — you signed up for our pilot a while back. I'm calling personally because I want to make sure you actually get value from it before the pilot period closes. Do you have two minutes?"

**If they say yes — the single qualifying question:**

> "Have you had a chance to respond to a lead through the dashboard, or is it still sitting at setup?"

- If not set up: offer a 10-minute live setup call, today or tomorrow.
- If set up: ask "What did the lead get?" and pivot to the conversion offer below.

---

### Script B: Cold/Warm Outreach to Identified Targets (no account yet)

**Text version:**

> Hi {First Name}, this is Stojan — I'm building an AI lead response tool for real estate agents that responds to new leads in under 30 seconds while you're in showings. I came across your name because [you mentioned missing leads during showings / you run Facebook ads to generate leads / you use Follow Up Boss].
> 
> Giving away 30 free pilot spots this month. No credit card. Connects to your FUB in about 5 minutes.
> 
> Want me to send you the link?

**Why text, not email:**
- 98% SMS open rate vs 20% email
- The personalization hook ("I came across your name because...") lands harder in a text
- Agents on their phones during showings will read a text; they won't check email

---

### Conversion Offer (use in both scripts when there's engagement)

If they're interested or want to know about cost:

> "Right now it's free for pilots — we're at capacity for the first 30 agents, so I can't promise to hold the spot. If it works for you in 14 days, it's $149/month. If it doesn't, there's nothing to cancel."

The $149 Pro tier, not $49 Starter — start where the value is. Agents who need this will pay for it.

---

## Part 2: THIS WEEK — Re-Engagement Email Sequence (Dev builds)

**Goal:** Re-engage the ~35 `pilot_signups` who never activated or never used the product.  
**Trigger:** Stojan approves send after confirming which records are real agents (not test data).  
**Dependency:** Resend email delivery must be verified first (fix-email-delivery-resend-from-domain-not-verified is complete per UC tracker).

### Email 1: "Your pilot is still waiting" (send Day 1)

**Subject:** Your LeadFlow pilot — still here, first AI response takes 90 seconds

**From:** Stojan Madjunkov <stojan@leadflowai.com>

---

Hi {first_name},

You signed up for a LeadFlow pilot a while back.

I don't know if you've had a chance to try it — life moves fast when you're working deals. But your account is still active and ready.

Here's what takes 90 seconds right now:

**[Run the Lead Simulator →]({dashboard_url}/onboarding)**

It shows you exactly what your leads would receive in the first 30 seconds of contacting you. No FUB connection needed — you can see it work before you connect anything.

If you want to go live with real leads after that, the FUB connection takes about 5 minutes.

Your pilot closes on {pilot_end_date}. If you don't want it, no action needed — nothing to cancel.

Stojan  
Founder, LeadFlow AI

---

**CTA:** `Run the Lead Simulator →`  
**Below CTA (small text):** No setup required for the demo — your account is already active.

---

### Email 2: "Before your pilot closes" (send Day 5 — only to non-activators)

**Subject:** Before your LeadFlow pilot closes — one thing I want to show you

**From:** Stojan Madjunkov <stojan@leadflowai.com>

---

Hi {first_name},

Quick one.

78% of deals go to the first agent to respond. Not the best agent. The first one.

LeadFlow handles that while you're in a showing, on a call, or just off the clock. It replies to new leads in under 30 seconds and books appointments to your calendar.

Your pilot is still active. One click to see it:

**[See your first AI response →]({dashboard_url}/onboarding)**

If this isn't for you, just ignore this — nothing to cancel.

Stojan

P.S. If you have 10 minutes and want me to walk you through it live, reply "call" and I'll send you my Cal.com link.

---

**CTA:** `See your first AI response →`  
**P.S. serves dual purpose:** surfaces the conversion call CTA without making it the main ask

---

### Email 3: Pilot-closing offer (send Day 9 — only to activators who haven't upgraded)

**Subject:** Your pilot closes in 5 days — upgrade offer inside

**From:** Stojan Madjunkov <stojan@leadflowai.com>

---

Hi {first_name},

Your LeadFlow pilot closes in 5 days.

Before it does, I want to make you an offer: upgrade to Pro today and your first month is $99 (normally $149).

You've seen what it does. Here's what you keep after the pilot:

- AI responses to every new lead in under 30 seconds
- Cal.com appointment booking in the thread
- Full FUB sync — nothing changes in your existing workflow
- Dashboard with every lead conversation

**[Upgrade to Pro — $99 first month →]({checkout_url})**

If you'd rather talk first: **[Book a 15-min call →]({demo_booking_url})**

Stojan

---

**CTA 1 (primary):** `Upgrade to Pro — $99 first month →`  
**CTA 2 (secondary):** `Book a 15-min call →`  
**Personalization note:** Only send this to agents who completed the lead simulator or connected FUB. Do not send to cold/unactivated signups.

---

## Part 3: POST-DAY-90 — Rebuilt Pilot Campaign (Dev + Design)

The original campaign failed because it had no execution infrastructure. This brief specifies what to build so the next wave doesn't stall.

### What broke and the fix

| Broke | Fix |
|-------|-----|
| Email blast had no send button | Build `/api/admin/outreach/blast` endpoint |
| Personalized demo links didn't exist | Build `POST /api/admin/demo-links` per the existing brief |
| No visibility into who was contacted | Build the `/admin/outreach` page per existing brief |
| Stojan had no outreach script | This document |
| Campaign targets not identified | Scrape FUB community, Facebook Groups, agent directories (Stojan + PM) |

### Campaign targeting for next 30 pilots

**Don't repeat the same list.** Expand the top-of-funnel:

1. **FUB Community Forum** — agents posting about lead response, missed calls, Zillow lead quality. These are inbound signals.
2. **r/realtors and r/RealEstate** — search "respond to leads" + "missed leads" + "Follow Up Boss" in the last 90 days
3. **Facebook Groups: "Follow Up Boss Users" and "Real Estate Tech"** — agents who already use FUB are 5x easier to convert
4. **BiggerPockets Forums** — "lead response" thread participants
5. **Inbound from landing page** — anyone who hit the site but didn't sign up (UTM + email capture)

**Qualification filter (only target agents who):**
- Use FUB (confirmed or highly likely)
- Have expressed a lead response pain point publicly
- Are solo or small team (not part of a large brokerage — longer sales cycle)

### Outreach sequencing for the next wave

This is a 3-touch sequence over 10 days. Dev builds the automation; Stojan does touch 1 personally.

| Touch | Channel | Timing | By whom |
|-------|---------|--------|---------|
| 1 | Personal text from Stojan | Day 0 | Stojan |
| 2 | Email (re-engagement sequence Email 1) | Day 3 | Automated |
| 3 | Email (closing offer) or second personal text | Day 7 | Automated or Stojan |

**Success criteria for the next 30-pilot wave:**
- Primary: 10 activations (lead simulator completed) within 30 days
- Secondary: 3 FUB-connected accounts within 30 days
- Conversion: 1 paid subscriber from this cohort within 45 days

---

## Part 4: Competitive Counter-Positioning (immediate messaging update)

**Threat:** Mod Ai Automation is now FUB Marketplace-listed, voice+SMS, "built by agents for agents."

**Our counter:**

Do not try to out-feature them in messaging. Win on speed, simplicity, and price point.

**For outreach:**
> "LeadFlow connects to FUB in under 5 minutes. Most agents see their first AI response within the hour. No setup call needed."

**For the landing page (copy update for dev):**

Replace generic hero copy with this version:

**H1:** Your FUB leads, answered in 30 seconds. Even during showings.

**H2:** LeadFlow responds to new leads via SMS the moment they come in — qualifies them, books appointments, and syncs everything back to Follow Up Boss. You just show up.

**Social proof placeholder (needed before launch):**
> "[Agent Name], [City] — 'I was in a showing when a Zillow lead came in. LeadFlow responded, qualified them, and booked the appointment. I had a signed contract two weeks later.'"

Dev/Design should build a placeholder that Stojan can fill in once the first pilot agent gives a real quote. Do not use fabricated testimonials.

---

## Human Action Items (not automatable — Stojan must execute)

The genome is correctly flagging these as blocked_human. No code fixes this.

| Action | When | What |
|--------|------|------|
| Audit pilot_signups table | Today | Identify real vs test accounts — confirm who to contact |
| Personal texts/calls | Today + tomorrow | Use Script A for existing signups, Script B for cold targets |
| Confirm outreach completed | After calls | Log outcome in pilot_signups.status (contacted/responded/no_interest) |
| Unblock the three UCs | After outreach evidence logged | PM confirms, orchestrator unblocks |

---

## What Dev Builds From This Brief

| Item | Priority | Brief reference |
|------|----------|-----------------|
| Re-engagement email sequence (3 emails above) | P0 | Part 2 |
| `/api/admin/outreach/blast` endpoint | P0 | `CONTENT-BRIEF-pilot-outreach-email-blast.md` |
| `/admin/outreach` page with campaign stats | P0 | `CONTENT-BRIEF-pilot-outreach-email-blast.md` |
| Personalized demo link generator | P1 | `CONTENT-BRIEF-pilot-outreach-email-blast.md` |
| Landing page hero copy update | P1 | Part 4 |
| Social proof placeholder component | P2 | Part 4 |

---

## Copy Rules (carry forward from existing brief)

1. **From name:** `Stojan Madjunkov` — not "LeadFlow AI" or "The Team"
2. **Tone:** Personal, direct, zero marketing-speak. Never: "solutions," "leverage," "synergy," "streamline."
3. **CTA copy:** Action verbs + specifics. "Run the Lead Simulator" beats "Get Started."
4. **Length:** Mobile-first. If it doesn't fit on a phone screen without scrolling, cut it.
5. **No fabricated testimonials.** Use a placeholder with Stojan's name until a real one exists.

---

*This brief is the source of truth for campaign recovery copy. Human action items (Part 1, Part 4 table) require Stojan to execute directly — no code can substitute.*
