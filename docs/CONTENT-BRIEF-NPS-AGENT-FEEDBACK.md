# Content Brief: NPS & Feedback Survey for Agents
**Feature ID:** feat-nps-agent-feedback  
**Audience:** Design & Dev teams  
**Date:** 2026-03-08  
**From:** Marketing Agent  

---

## Overview

This brief summarizes the **marketing copy and content requirements** for the NPS & Feedback Survey feature. Full copy, tone guidelines, and implementation specs are in `MARKETING-NPS-AGENT-FEEDBACK.md`. This document is a quick reference for Design & Dev.

---

## Key Messages

**Primary message:** 
> We genuinely want to understand how agents experience LeadFlow, so we can build better.

**Tone:** Conversational, curious, respectful. Like talking to a friend, not a corporation.

**Why this matters:** 
- Agents are our paying customers (post-pilot)
- We have no early-warning system for churn right now
- Feedback helps us validate PMF before scaling

---

## Copy Inventory

### 1. Email Survey

**Subject:** "Quick question — how are we doing?"

**Body (plain text):**
```
Hi [AGENT_FIRST_NAME],

We just want to know: how likely are you to recommend LeadFlow AI to another real estate agent?

Click below and give us a score (0–10):

[SURVEY_LINK_WITH_JWT]

This takes about 60 seconds, and your feedback helps us build what agents actually need.

Questions? Hit reply — we read everything.

— The LeadFlow Team
```

**Implementation notes:**
- Plain text only (no HTML)
- Use Resend integration (same as password reset)
- JWT token in URL for auth (no login required)
- Include unsubscribe link at bottom

---

### 2. In-App Prompt (Modal)

**Heading:** "Quick feedback?"

**Body:** "We'd love to know how we're doing. Takes about 60 seconds."

**Buttons:**
- Primary: "Give feedback"
- Secondary: "Not now"

**Rules:**
- Shown on dashboard login if survey trigger fired
- Dismissible (agent can close it)
- Dismissed prompt doesn't re-appear for 30 days
- Must not block core dashboard features

---

### 3. Feedback Button & Form

**Button label:** "Give Feedback" (low-prominence, footer or sidebar)

**Form heading:** "Tell us what's on your mind"

**Feedback types:**
1. "Works great! 👍"
2. "Found a bug 🐛"
3. "Have an idea 💡"
4. "Something's bugging me 😤"

**Text field:**
- Label: "Tell us more (max 500 characters)"
- Placeholder: "What happened? What would help? Any details help us improve."

**Submit button:** "Send Feedback"

**Success message:** "Thanks! We read every submission."

---

### 4. Admin NPS View

**Page heading:** "Agent Feedback"

**Sections:**
1. **NPS Score (Last 90 Days)** — Display number + explanation
2. **Score Distribution** — Breakdown by Promoter/Passive/Detractor with counts & %
3. **Recent Responses** — Table of 20 most recent with agent, score, feedback, date
4. **Survey Performance** — Response count this period vs last period

**Color coding for status:**
- 🟢 Green = Promoter (9–10)
- 🟡 Yellow = Passive (7–8)
- 🔴 Red = Detractor (0–6)

---

## Design Deliverables

**For Design team — create:**

1. Email template layout (plain text, can be simple mock)
2. In-app modal mockup (heading, body, button states, mobile + desktop)
3. Feedback button placement options (footer vs sidebar)
4. Feedback form layout (type selector, text field, buttons, mobile + desktop)
5. Admin NPS view dashboard mockup (metric cards, breakdown chart/table, response list)

**Design principles:**
- Keep it light and approachable (not corporate or heavy)
- Emojis in form labels add personality without being unprofessional
- Admin view should feel like rest of dashboard
- Mobile-first (agents often use dashboard on phone)

---

## Development Deliverables

**For Dev team — implement:**

| Item | Details |
|------|---------|
| Email template | Plain text via Resend, with JWT token URL |
| In-app modal | Triggered on dashboard login, dismissible, 30-day cooldown |
| Feedback form | 4 types, 500-char text field, POST to `/api/feedback` |
| Success message | Brief confirmation after form submit |
| Admin view | `/admin/nps` route, NPS score calc, response list, color-coded breakdown |
| Analytics | Track email opens, link clicks, prompt views, form submissions |

**Spec reference:** See section 6 in `MARKETING-NPS-AGENT-FEEDBACK.md` for full implementation checklist.

---

## Tone Checklist

Before launch, ensure all copy follows these rules:

- ✅ Uses "we" not "LeadFlow"
- ✅ Conversational (contractions, short sentences)
- ✅ No product jargon (don't say "NPS," "sentiment," "feedback mechanism")
- ✅ Action-oriented verbs (Give Feedback, Send Feedback, not Submit)
- ✅ Respects agent's time (say "takes 60 seconds," not "will require approximately one minute")
- ✅ Friendly and curious (genuine, not salesy)

---

## Success Criteria

Feature is ready to launch when:

1. Email copy is integrated and plain text looks good
2. In-app prompt appears on schedule and dismissal is tracked
3. Feedback form accepts all 4 types and stores submissions
4. Admin NPS view displays score, breakdown, and recent responses
5. Analytics events are firing (emails opened, links clicked, forms submitted)
6. End-to-end test passes: email → click → submit → score in admin view

---

## Questions?

Refer to full copy in `MARKETING-NPS-AGENT-FEEDBACK.md`, or ask PM for clarification.

