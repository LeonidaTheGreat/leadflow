# Content Brief: Lead Magnet & Email Capture

**For:** Design Agent (section UI spec) + Dev Agent (implementation)
**PRD:** `docs/prd/PRD-LEAD-MAGNET-EMAIL-CAPTURE.md`
**Task:** `feature-lead-magnet-email-capture-landing-page` (d028cb3e)
**Status:** Marketing copy approved — ready for design + dev

---

## 1. Landing Page Section Copy

### Placement
Insert between the **Testimonials** section and the **Pricing** section in `app/page.tsx`.
This is the highest-leverage position: visitors have seen the product demo (How It Works) and social proof (Testimonials), and are about to face the pricing decision. This section catches fence-sitters before they hit price.

### Section structure

```
[small label]  FREE RESOURCE FOR REAL ESTATE AGENTS

[headline]     Not ready to commit yet? That's okay.

[subheadline]  Get "The 5-Minute AI Lead Response Playbook" — free.
               How top agents respond faster and convert more leads, in plain English.

[value bullets]
  ✓  3 word-for-word SMS templates to send the moment a lead arrives
  ✓  Why 78% of deals go to whoever responds first — and how to be that agent
  ✓  The fast qualification system that books more showings in fewer messages

[optional first name field]  placeholder: "Your first name (optional)"
[email field]               placeholder: "your@email.com"
[CTA button]                "Send Me the Playbook →"

[trust line]
  No spam. Unsubscribe anytime. Your guide arrives in under 60 seconds.
```

### States

**Success** (replace the form, keep the section visible):
> Your playbook is on its way! Check your inbox — it should arrive in the next minute.
> While you wait: [Try the live AI demo →](/demo)

**Validation error** (inline, below the email field):
> Please enter a valid email address.

**API error** (inline, below the CTA button):
> Something went wrong. Please try again or email us at support@leadflow.ai.

**Duplicate email** (treat as success — do not reveal):
> Your playbook is on its way! Check your inbox — it should arrive in the next minute.

### Design direction for Design Agent
- Background: soft teal/emerald gradient or muted emerald-50 — distinct from the white/slate sections it sits between
- The section should feel like a helpful pause, not an interruption — approachable and low-pressure
- Value bullets: emerald checkmarks, tight spacing
- Form: single-row on desktop (name + email + button inline), stacked on mobile
- `data-testid="lead-magnet-section"` on the section element
- `data-testid="lead-magnet-form"` on the form
- `data-testid="lead-magnet-success"` on the success state
- Analytics: fire `lead_magnet_view` on IntersectionObserver, `lead_magnet_submit` on submit, `lead_magnet_success` on 200 response, `lead_magnet_error` on failure

---

## 2. Lead Magnet Content: "The 5-Minute AI Lead Response Playbook"

**Delivery format for v1:** Rich HTML email (no PDF hosting needed). The Dev agent sends the guide inline in Email 1 below using Resend.
**Tone:** Peer-to-peer, practical, from a fellow professional. Not corporate. Short paragraphs.
**Reading time:** ~4 minutes

---

### Cover

**Title:** The 5-Minute AI Lead Response Playbook
**Subtitle:** How Top Real Estate Agents Never Miss a Lead — and Convert 3× More
**Byline:** From Stojan at LeadFlow AI

---

### Section 1 — The Problem Is Speed

Real estate is a game of seconds.

Research shows **78% of deals go to the first agent who responds to a lead.** Not the best agent. Not the most experienced. The first one.

And the reality? 35% of online real estate leads never get a response at all — from any agent.

The agents winning right now aren't necessarily better at closing. They're better at showing up first.

Here's what this looks like in practice:

> **8:47 PM.** A lead submits an inquiry on Zillow for a $580,000 listing. You're wrapping up dinner. You see the notification at 9:12 PM. You draft a response. You hit send at 9:31 PM.
>
> By 9:05 PM, another agent had already texted: *"Hi Sarah, just saw your inquiry on Oak Street — would love to show it to you. Are you free this weekend?"*
>
> Sarah is already replying to them.

This isn't about working harder. It's about responding faster.

---

### Section 2 — The 5-Minute Rule

MIT research on web lead conversion found that **if you don't respond within 5 minutes, your odds of qualifying the lead drop by 80%.**

After 5 minutes, people mentally move on — they assume you're busy, or not interested, or just like every other agent who ignored them.

In real estate, that 5-minute window opens at the worst times:
- During showings with other clients
- After 7 PM when you're with family
- Weekends
- Anytime you're driving

The agents who consistently win aren't responding faster because they have more time. They've removed the manual step.

---

### Section 3 — Your First Response Templates

The first text you send sets the tone for everything. Here are the three templates top agents use:

**Template 1: Inquiry on a specific listing**
> Hi [First Name]! I saw your question about [Property Address]. I'd love to help — are you looking to schedule a showing, or do you have questions about the property first?
> — [Your Name]

**Template 2: General buyer inquiry**
> Hi [First Name]! Thanks for reaching out. I work with buyers in [Market] and would love to help you find the right home. What's your ideal timeline, and are you working with a lender yet?
> — [Your Name]

**Template 3: After-hours inquiry (arrive at 2 AM)**
> Hi [First Name], I just saw your inquiry about [Property/Area]. I'm available tomorrow — would a quick call work to talk through what you're looking for?
> — [Your Name]

**What makes these work:**
1. **Their name first.** Personalizes immediately, doesn't feel like a blast.
2. **Reference their specific inquiry.** Shows you read it.
3. **One clear question.** Not three. The one that opens a conversation.
4. **Your name.** Keeps it human.

---

### Section 4 — Fast Qualification (The 3 Questions)

Once they reply, qualify quickly without making it feel like an interrogation. Three questions handle 80% of it:

1. **Timeline:** "Are you looking to move in the next 30-60 days, or are you still early in the process?"
2. **Pre-approval:** "Have you had a chance to connect with a lender, or would that be a helpful next step?"
3. **Motivation:** "What's driving the move? — buying more space, relocating, investment?"

The goal: know enough to either:
- **Book a showing** (motivated + pre-approved = move fast)
- **Refer to a lender** and follow up in 2 weeks
- **Add to a drip** and revisit in 60 days

Not every lead closes this month. But the ones you lose touch with become someone else's client in 90 days.

---

### Section 5 — The Follow-Up Sequence

Most leads don't buy on the first conversation. The agent who stays top-of-mind wins.

| Day | Message |
|-----|---------|
| Day 1 (immediate) | First response (templates above) |
| Day 3 (no reply) | "Hi [First Name], just checking back in — did you have a chance to see the property? Still happy to help when you're ready." |
| Day 7 | Share a relevant listing or market insight: "Just saw a similar home list at [Price] — thought you might be interested." |
| Day 14 | "Checking in — any questions, or would you like to set up a call to talk through your options?" |
| Day 30+ | Monthly market update (if on your email list) |

**The key:** brief, relevant, not pushy. Every touch gives them a reason to respond — without making them feel followed.

---

### Section 6 — How AI Changes This

Here's the honest truth: even with the best templates, manually texting 20-40 new leads a day — on top of showings, closings, and prospecting — is unsustainable for a solo agent.

The agents outperforming everyone right now have removed the manual step.

They use AI to:
- Detect new leads the moment they come in (even at 2 AM)
- Send a personalized first response using the lead's name, property of interest, and inquiry context
- Follow up on schedule without lifting a finger
- Qualify through conversation, so when you step in, the lead is already warm

**This isn't replacing you.** The AI handles speed and initial follow-up. You close the deal.

LeadFlow AI does exactly this — and it connects directly to Follow Up Boss, the CRM most serious agents already use.

---

### Section 7 — Your Next Step

If any of this resonated — if you've lost leads because you couldn't respond fast enough, or if you're tired of texting at 10 PM — LeadFlow was built for this.

**Start your 14-day free trial:** [leadflow-ai-five.vercel.app/signup/trial]

No credit card. Setup in under 15 minutes. The AI starts responding to your leads the same day.

Or see it live first: [leadflow-ai-five.vercel.app/demo]

Questions? Reply to this email — I read every one.

— Stojan
Founder, LeadFlow AI

---

## 3. Three-Email Nurture Sequence

### Email 1 — Immediate Delivery

**Subject:** Your AI Lead Response Playbook is here 🏡
**Preview text:** 7 pages on how top agents never miss a lead — plus 3 templates you can use today
**From name:** Stojan at LeadFlow AI
**From address:** stojan@leadflow.ai (or configured Resend domain)

---

Hi [First Name],

Here's your copy of The 5-Minute AI Lead Response Playbook.

**[Read the Playbook →]** ← link to hosted version or inline below

What's inside:
- The 5-minute rule — why speed beats skill for converting leads
- 3 word-for-word SMS templates to send the moment a lead arrives
- The fast qualification system that books more showings in fewer messages
- Why AI is how the top-performing agents are winning in 2026

Quick note from me: I built LeadFlow because I watched good agents lose deals to slower agents. The playbook gives you the manual playbook. LeadFlow automates it.

If you want to see what that looks like in practice, your 14-day free trial is waiting:

**[Try LeadFlow Free →]** ← /signup/trial

No credit card required. Most agents are live in under 15 minutes.

— Stojan
Founder, LeadFlow AI

P.S. The trial includes full AI setup and Follow Up Boss integration. If you need help getting started, just reply here.

---

### Email 2 — Day 3: The Cost of Slow Response

**Subject:** What actually happens when you respond in 5 minutes vs. 5 hours
**Preview text:** I ran the numbers. The gap is bigger than you think.
**From name:** Stojan at LeadFlow AI

---

Hi [First Name],

A quick story.

Two agents get the same Zillow lead at the same time. Same market. Same property.

Agent A responds in 4 minutes.
Agent B responds in 4 hours.

Agent A's response rate from that lead: 67%.
Agent B's response rate from that lead: 11%.

Agent A books a showing. Agent B gets ghosted.

This tracks with MIT research on web lead conversion: after 5 minutes, your odds of qualifying a lead drop by 80%.

Most agents already know this. The problem isn't awareness — it's that responding in 5 minutes is physically impossible when you're with a client, on a showing, or asleep.

That's exactly what LeadFlow solves.

The moment a lead comes in, LeadFlow sends a personalized SMS — using their name, the property they asked about, and a question that opens a real conversation. Then it follows up on schedule, qualifies through the conversation, and books a showing on your calendar.

You step in when the lead is warm. The AI handles the window.

Your 14-day trial is still open — no credit card needed.

**[See How LeadFlow Works →]** ← /demo

— Stojan

P.S. If you have a specific question about whether LeadFlow fits your workflow, just reply. Happy to walk you through it.

---

### Email 3 — Day 7: Pilot Offer

**Subject:** A few pilot spots left — wanted to offer you one
**Preview text:** Personal note from the founder
**From name:** Stojan at LeadFlow AI

---

Hi [First Name],

Quick personal note.

You downloaded the lead response playbook last week. I wanted to reach out before we close this pilot cohort.

LeadFlow is running a limited pilot program — it's how we get real feedback from real agents before we scale. Pilot members get:

- **20% lifetime pricing** (locked in as long as you're a member)
- White-glove onboarding — I walk you through setup personally
- Direct access to me for questions and feedback

We have a few spots left.

I'm not going to oversell this. It's a good product that's getting better. What I can tell you is it works: responds to leads in under 30 seconds, integrates with Follow Up Boss in under 5 minutes, and has helped agents in our beta book appointments they would have otherwise missed.

If you want in:

**[Apply for the Pilot Program →]** ← /pilot

Or if you'd rather start a free trial on your own terms:

**[Start Your 14-Day Free Trial →]** ← /signup/trial

Either way — thanks for reading the playbook. I hope it was useful regardless of what you decide.

— Stojan
Founder, LeadFlow AI

P.S. If LeadFlow isn't for you, no problem. You can unsubscribe below — I won't follow up after that.

---

## 4. Design Agent Handoff Notes

### Visual direction for the landing page section

The section should read as a **generous pause** — not another conversion push. The surrounding page is all CTAs pointing at signup; this section says "no pressure, here's something useful." The visual design should reinforce that:

- **Background:** `bg-emerald-50 dark:bg-emerald-950/20` — subtly distinct from white/slate-50 neighbors
- **Container:** max-w-2xl centered, generous padding (py-20), not full-bleed
- **Headline size:** text-3xl, matches section headers elsewhere on the page
- **Value bullets:** small text (text-sm), emerald checkmark (✓), left-aligned under subheadline
- **Form layout:**
  - Desktop: `[First Name input] [Email input] [CTA button]` — single row
  - Mobile: stacked inputs + full-width button
  - Input style: match existing form inputs on the page (border-slate-300, rounded-lg, focus:ring-emerald-500)
  - CTA button: `bg-emerald-500 hover:bg-emerald-600 text-white` — matches other primary buttons
- **Trust line:** text-xs, text-slate-500, centered below form
- **No image needed for v1** — clean and fast to ship

### Key `data-testid` attributes (required by QC)

| Element | testid |
|---------|--------|
| Section wrapper | `lead-magnet-section` |
| Form element | `lead-magnet-form` |
| First name input | `lead-magnet-firstname` |
| Email input | `lead-magnet-email` |
| Submit button | `lead-magnet-submit` |
| Success state wrapper | `lead-magnet-success` |
| Error message | `lead-magnet-error` |

---

## 5. Dev Agent Implementation Notes

### New component
`product/lead-response/dashboard/components/lead-magnet-capture.tsx`
- Client component (`'use client'`)
- Handles form state, submission, success/error states
- Fires GA4 events via `trackCTAClick` or a `window.gtag` call

### API endpoint
`/api/lead-capture` (POST) — see PRD §5.2 for full spec
- Validate email format (server-side)
- Upsert into `pilot_signups` with `source = 'lead_magnet'`, `status = 'nurture'`
- Send Email 1 via Resend immediately
- Return `{ success: true }` — always 200 for valid emails (including duplicates)

### Email delivery
Use Resend API (same as existing email setup). The playbook content from Section 2 above is the email body for Email 1. Emails 2 and 3 are scheduled — for v1, record in DB and send via a scheduled job or next heartbeat check.

### Database
May need `source` and `status` columns on `pilot_signups` — check schema, add migration if missing.

### UTM capture
Read `utm_source`, `utm_medium`, `utm_campaign` from URL params (passed in form POST body) and save to `pilot_signups`.
