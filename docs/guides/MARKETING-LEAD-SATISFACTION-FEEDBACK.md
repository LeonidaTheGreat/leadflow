# Marketing Content Strategy — Lead Satisfaction Feedback Collection
**Document ID:** MARKETING-LEAD-SATISFACTION-FEEDBACK  
**Use Case:** feat-lead-satisfaction-feedback  
**PRD:** PRD-LEAD-SATISFACTION-FEEDBACK  
**Date:** 2026-03-06  
**Status:** Draft  
**Owner:** Marketing Agent

---

## Overview

This document defines the content strategy, messaging framework, and copy requirements for the Lead Satisfaction Feedback Collection feature.

**What it is:** After an AI SMS exchange, leads receive a brief satisfaction ping. Replies are classified and surfaced to agents via a dashboard widget. Agents can toggle pings off.

**Who we're writing for:**
1. **Real estate agents** — the primary audience. They see the dashboard widget, the settings toggle, and any in-product messaging about this feature.
2. **Leads** — the secondary audience. They receive the satisfaction ping SMS directly.

**Marketing role:** Define what to say, how to say it, and what emotional response to drive at each touchpoint. Design/Dev implement the UI and wire up the logic.

---

## 1. Positioning & Messaging Framework

### 1.1 The Core Insight

Agents using AI SMS worry about one thing: *Is this making my leads like me less?*

The satisfaction feedback feature answers that question directly — with real data, not guesswork. This is a trust signal, not just a product feature.

**Positioning statement (internal use):**
> Lead Satisfaction Feedback turns "I hope the AI isn't ruining my relationships" into "I can see that 84% of my leads found it helpful." It gives agents confidence to scale AI SMS — and gives LeadFlow the signal to keep making it better.

### 1.2 Messaging Pillars

| Pillar | What It Means | Copy Direction |
|--------|--------------|---------------|
| **Transparency** | Agents see real lead sentiment, not black-box AI | "See exactly how your leads feel" |
| **Control** | Agents can turn pings off if it doesn't fit their market | "Your market, your call" |
| **Improvement loop** | Feedback makes the AI better for everyone | "Every reply makes the AI smarter" |
| **Compliance** | Opt-out reminder baked into every ping | "Built for A2P compliance, not just as an afterthought" |

### 1.3 Feature Name & Label

**UI Label:** "Lead Satisfaction"  
**Settings Label:** "Satisfaction check-ins"  
**Dashboard Widget Title:** "Lead Satisfaction"  
**Tone:** Confident, data-forward, warm — not clinical.

---

## 2. SMS Copy — The Satisfaction Ping

### 2.1 Approved Message Template

```
Was this conversation helpful? Reply YES or NO — it helps us improve. (Reply STOP anytime to unsubscribe)
```

**Character count:** 93 characters ✅ (well under 160-char SMS limit)

### 2.2 Copy Rationale

- **"Was this conversation helpful?"** — Neutral framing. Not "Did you enjoy talking to our AI?" (reveals the AI). Not "Rate us!" (sounds salesy). Focuses on the *lead's experience*, not the agent's ego.
- **"Reply YES or NO"** — Reduces friction to the minimum possible action. Binary choice = lower barrier = higher response rate.
- **"it helps us improve"** — Gives the lead a reason to bother. Their reply has a purpose. Subtle social contract.
- **"Reply STOP anytime to unsubscribe"** — TCPA/A2P compliance baked in. Non-negotiable. Keeps it brief (not a wall of legal text).

### 2.3 What NOT to Say (Rejected Alternatives)

| Copy | Why Rejected |
|------|-------------|
| "Did you enjoy chatting with our AI assistant?" | Reveals the AI — breaks the agent-lead relationship |
| "Rate your experience from 1–5 by replying with a number" | Too much friction. Kills response rate. |
| "Hi [Name], your agent asked us to check in…" | Confusing attribution; sounds like a different party |
| "We'd love your feedback! Click here →" | No links in A2P SMS pings; click-through kills conversion |
| "Reply HELPFUL or NOT HELPFUL" | Multi-word replies feel like effort. Keep it to one word. |

### 2.4 Keyword Classification (for Dev Reference)

| Classified As | Keywords |
|--------------|---------|
| `positive` | YES, HELPFUL, GOOD, GREAT, THANKS |
| `negative` | NO, BAD, ANNOYING, QUIT (STOP triggers opt-out flow separately) |
| `neutral` | NEUTRAL, OK, FINE, MEH |
| `unclassified` | Everything else |

**Note for Dev:** STOP must be intercepted *before* satisfaction classification and routed to the existing opt-out flow. Never log a STOP reply as `negative`.

---

## 3. Dashboard Widget — Content Brief

### 3.1 Widget: "Lead Satisfaction"

**Component name (for Dev):** `<LeadSatisfactionCard />`  
**Placement:** Agent dashboard, alongside other performance metrics  
**Visible when:** Agent has ≥ 5 satisfaction responses collected (last 30 days)  
**Hidden state:** Do not show an empty or zero-state card. Suppress entirely until threshold is met.

#### Widget Content Requirements

| Element | Copy / Content |
|---------|---------------|
| **Card Title** | "Lead Satisfaction" |
| **Subtitle / timeframe** | "Last 30 days" |
| **Primary metric** | Percentage positive (e.g., "84% helpful") — prominently displayed |
| **Secondary metrics** | % negative, % neutral shown as smaller supporting figures |
| **Response count** | "Based on [N] responses" — anchors the metric with volume |
| **Trend indicator** | "↑ Improving vs. last 30 days" / "↓ Declining vs. last 30 days" / "→ Stable" |
| **Drill-down CTA** | "View all responses →" (expands to event list) |

#### Drill-Down List (Individual Events)

| Column | Content |
|--------|---------|
| Lead | Masked/anonymous (phone last 4 digits or first name if available) |
| Date | Relative ("2 days ago") or absolute (MM/DD) |
| Rating | Icon + label: ✅ Helpful / ❌ Not helpful / — Neutral |
| Raw reply | Small, secondary text (e.g., "YES", "MEH") |

### 3.2 Empty State (< 5 Responses)

**Do not show the card.** No empty-state messaging, no "check back later" placeholder. Suppress the widget entirely. This avoids noise and prevents agents from drawing conclusions from statistically meaningless data.

*(Design note: If product decides to show a teaser state in a future iteration, copy would be: "Satisfaction data will appear here once 5+ leads have responded.")*

### 3.3 Tooltip / Info Copy

Small (i) info icon on the card title. On hover/tap:

> **How is this measured?**  
> After each AI conversation, we send leads a brief optional check-in. Their replies are tracked here. Only your leads' responses are shown — never data from other agents.

---

## 4. Agent Settings — Toggle UI Copy

**Location:** Agent Settings page  
**Section heading:** "AI Conversation Settings" (or existing settings section — confirm with Design)

### 4.1 Toggle Label & Description

| Element | Copy |
|---------|------|
| **Toggle label** | "Satisfaction check-ins" |
| **Default state** | ON |
| **Supporting description** | "After AI SMS conversations, leads receive a brief optional message asking if the exchange was helpful. Replies are shown in your dashboard." |

### 4.2 Toggle States

**ON state label:** "Enabled"  
**OFF state label:** "Disabled"

### 4.3 Confirmation / Helper Text (when toggling OFF)

Show inline helper text (no modal) immediately below the toggle when switched OFF:

> "Satisfaction check-ins are off. Leads won't receive post-conversation messages. Your existing data is still visible in the dashboard."

**Do NOT show a warning modal or friction for toggling off.** Agents who disable this have made an informed decision. Friction here erodes trust.

---

## 5. In-App Feature Introduction (Optional — for Design to decide)

### 5.1 First-Time Dashboard Callout

*For agents who haven't seen the widget yet — show once, dismiss-able.*

**Callout placement:** Anchored to the Lead Satisfaction card (or where it will appear once threshold is met).

**Copy:**

> **New: Lead Satisfaction tracking**  
> Once 5+ leads have replied to check-ins, you'll see satisfaction data here. No action needed — check-ins go out automatically after AI conversations.  
> [Got it →]

### 5.2 Feature Announcement (for Email / In-App Banner — if applicable)

**Subject / Headline:** "Now you can see how leads actually feel about your AI responses"

**Body copy:**

> We've added a new signal: Lead Satisfaction.
>
> After each AI SMS conversation, leads receive a short optional check-in. Their replies — YES, NO, and everything in between — are aggregated in your dashboard so you can see if the AI is helping or creating friction.
>
> It's lightweight, compliant, and takes no setup. If you ever feel it's not the right fit for your market, you can turn it off in Settings.
>
> [View your dashboard →]

---

## 6. Compliance & Legal Copy Notes

### 6.1 TCPA / A2P Compliance Requirements

The satisfaction ping SMS **must always include an opt-out instruction.** The approved template already includes:

> "(Reply STOP anytime to unsubscribe)"

**This line is non-negotiable and must not be removed or truncated by Dev.**

### 6.2 Not Impersonating the Agent

The ping message does not include the agent's name or "your agent" language. It reads as a system message. This is intentional:
- Avoids the lead thinking the agent personally sent a survey
- Reduces confusion if the lead doesn't remember the AI conversation clearly
- Keeps the message neutral and non-pushy

**Dev note:** Do not prepend agent name or "Hi [Name]" to the satisfaction ping template.

---

## 7. Content Requirements Summary for Design & Dev

| Area | What to Build | Copy Source |
|------|--------------|-------------|
| SMS ping template | Exact string (do not modify) | Section 2.1 |
| Reply classification keywords | Keyword lists per rating category | Section 2.4 |
| Dashboard widget title/labels | All label copy | Section 3.1 |
| Dashboard tooltip | Info icon hover text | Section 3.3 |
| Settings toggle label + description | Label, ON/OFF states, helper text | Section 4.1–4.3 |
| First-time callout (optional) | Headline + body + CTA | Section 5.1 |
| Feature announcement email (optional) | Subject + body + CTA | Section 5.2 |

---

## 8. Success Metrics (Marketing Lens)

| Metric | Target | What It Tells Us |
|--------|--------|-----------------|
| SMS response rate | ≥ 20% | Lead engagement; if <10%, revisit copy |
| % leads rating as helpful | ≥ 70% | AI quality signal; feeds future messaging |
| Dashboard widget adoption | ≥ 80% of active agents view it | Feature awareness and utility |
| Toggle-off rate | < 20% of agents | Agent trust in the feature |

If SMS response rate drops below 10%, revisit the ping copy — consider A/B testing "Was this helpful? YES or NO" vs. current template.

---

## 9. What Marketing Is NOT Responsible For

- Building the `<LeadSatisfactionCard />` component (Design + Dev)
- Database schema for `lead_satisfaction_events` (Dev)
- SMS trigger logic and cooldown enforcement (Dev)
- Reply classification logic (Dev)
- Supabase aggregate query for product team (Dev)
- End-to-end QC testing (QC)

---

*Document complete. Next step: Design — build `<LeadSatisfactionCard />` widget and Settings toggle UI using copy from this brief.*
