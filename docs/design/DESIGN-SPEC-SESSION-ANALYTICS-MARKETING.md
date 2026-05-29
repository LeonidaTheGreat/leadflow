# Session Analytics — Design Brief, Internal Playbook & PMF Signal Brief

---

## PART 1: DESIGN BRIEF — Agent Dashboard Analytics Display

### 1.1 Dashboard Analytics Page — Primary Metrics

**Page headline:** "Your LeadFlow Activity"
**Subhead:** "See how your AI is working for you."

---

#### Metric Cards (top row)

| Card Label | What it shows | Tooltip copy |
|---|---|---|
| **AI Responses Sent** | Total SMS responses sent by the AI this month | "Every response sent in under 30 seconds — while you were busy." |
| **Leads Contacted** | Unique leads the AI reached out to | "Unique leads your AI engaged this month." |
| **Meetings Booked** | Cal.com appointments created via AI | "Appointments booked directly from AI conversations." |
| **Avg. Response Time** | Median time from lead arrival to first SMS | "Industry average is 47 minutes. You're at X seconds." |

**Card copy pattern:** Show a big number, a trend arrow (vs. last 7 days), and one sentence of context.

Example card copy:
```
AI Responses Sent
───────────────
    14
↑ 3 from last week

"Your AI is working while you show homes."
```

---

#### Activity Timeline (below cards)

**Section label:** "Recent AI Activity"
**Subhead:** "Every lead your AI touched, in order."

Show a chronological feed of AI events:
- "AI responded to [Lead First Name] in 18 seconds — [timestamp]"
- "Meeting booked with [Lead First Name] for [date] — [timestamp]"
- "Follow-up sent to [Lead First Name] — [timestamp]"

Cap display at 10 most recent events. Link: "View all conversations →"

---

#### Conversion Funnel Widget

**Label:** "Your Lead Funnel This Month"

```
Leads Received     [24]  ████████████████████████
AI Responded       [22]  ██████████████████████░░
Replied Back       [ 9]  █████████░░░░░░░░░░░░░░░
Meeting Booked     [ 3]  ███░░░░░░░░░░░░░░░░░░░░░
```

**Beneath the funnel, one insight line** (auto-generated from data):
- If reply rate > 30%: "Strong engagement — leads are responding to your AI's messages."
- If reply rate < 15%: "Tip: try enabling the qualification question in your AI settings. It often doubles reply rates."
- If meetings booked = 0: "No meetings yet — your AI has the conversation started. Want to review your booking link setup?"

---

### 1.2 Empty States — First Login Copy

**Scenario A: Agent just signed up, no leads processed yet**

```
🎯 Your AI Is Ready — Now Connect Your Leads

You're all set. The moment a lead hits Follow Up Boss,
your AI responds in under 30 seconds.

Nothing to show yet — that's about to change.

[ Connect Follow Up Boss ]   [ Run a Test Lead ]
```

**Scenario B: FUB connected, but no leads have come in yet**

```
Connected ✓ — Waiting for Your First Lead

Your AI is live. When a lead arrives, it'll respond
automatically and you'll see activity here.

In the meantime, run a simulated lead to see exactly
what your AI says.

[ Run Lead Simulator ]
```

**Scenario C: Has some data but it's their first time viewing this page**

```
Here's what your AI did while you were away.
```
(No empty state — go straight to data.)

---

### 1.3 Activation Milestone Copy

These appear as subtle inline notifications when an agent crosses a threshold. They are NOT toasts — they are persistent banners on the analytics page that dismiss on click.

| Trigger | Banner copy |
|---|---|
| First AI response sent | **"Your AI just responded to its first lead."** That's one lead who didn't go to a competitor. |
| 3 responses sent | **"3 leads contacted — all in under 30 seconds."** You would have had to drop everything to match that manually. |
| First reply received from a lead | **"A lead wrote back."** Your AI started a real conversation. |
| First meeting booked | **"First meeting booked by your AI."** That's the whole point. This is what $149/month looks like. |
| 10 responses sent | **"10 leads contacted this month."** At the industry average response time, you'd have lost at least 6 of these. |

**Banner design note:** Light background, one line bold, one line regular, dismiss X. No icon needed — the number does the work.

---

### 1.4 Re-Engagement Nudge Copy (Low-Activity Agents — Shown In-App)

Triggered when: agent has not logged in for 5+ days, OR logged in but has zero AI activity in 7 days.

**In-dashboard banner (shown on /dashboard homepage, not analytics page):**

```
Your AI hasn't heard from you in a while.

It's still running — but it works better when you
review its conversations and fine-tune the settings.

[ See What Your AI Did ]   [ Check Settings ]
```

**Alternate variant (if FUB not connected):**

```
One step away from your first AI response.

You haven't connected Follow Up Boss yet.
That's the only thing standing between you
and never losing a lead to response time again.

[ Connect FUB — Takes 2 Minutes ]
```

---

### 1.5 Metric Labels, Tooltips & CTA Text Reference

| Element | Copy |
|---|---|
| "AI Responses Sent" tooltip | "SMS messages sent by your AI to new leads. Each one went out in under 30 seconds." |
| "Meetings Booked" tooltip | "Appointments confirmed via Cal.com — booked directly from AI conversations, no manual scheduling." |
| "Avg. Response Time" tooltip | "Time from when the lead arrived to when your AI sent the first SMS. National average for agents is 47 minutes." |
| Analytics page CTA (trial users) | "Upgrade to Pro to unlock full conversation history and booking analytics." |
| Empty funnel CTA | "Run a test lead to see your AI in action →" |
| Upgrade nudge on analytics page | "You're on a free pilot. Upgrade to keep this running after your trial ends." |
| Trial expiry approaching (7 days out) | "Your pilot ends in 7 days. Don't lose your AI setup — upgrade to keep it." |

---

## PART 2: INTERNAL PLAYBOOK — Converting Pilots to Paid

### 2.1 Pilot Segmentation

**Definition: ACTIVE pilot**
- Logged in at least once in the last 7 days, AND
- Has at least 1 AI response sent in the last 14 days

**Definition: INACTIVE pilot**
- Has not logged in for 7+ days, OR
- Logged in but zero AI activity in 14 days

**Definition: ACTIVATED (predicts conversion)**
The two behaviors that most strongly predict willingness to pay:
1. **AI booked at least 1 meeting** — the agent saw dollar-value ROI directly
2. **Agent reviewed AI conversations at least twice** — the agent is invested in the output quality, not just passively watching

An agent who hits both of these within their first 14 days should be treated as conversion-ready and contacted within 24 hours of the second trigger.

---

### 2.2 Outreach Templates — INACTIVE Pilots

**Email — Inactive pilot, FUB not connected (no product value delivered)**

```
Subject: Your LeadFlow pilot is still waiting on one thing

Hi [First Name],

You signed up for a LeadFlow pilot — thanks for that.

But I noticed you haven't connected Follow Up Boss yet,
which means your AI hasn't responded to a single lead.

That's the only step between you and never missing
a lead to slow response time again.

It takes about 2 minutes. Here's exactly how:
[link to FUB setup guide]

If you hit any snag, reply to this email and I'll
walk you through it personally.

— Stojan, LeadFlow
```

**Email — Inactive pilot, FUB connected but no logins in 7 days**

```
Subject: Quick check-in on your LeadFlow pilot

Hi [First Name],

Your AI has been running in the background —
it's responded to [X] leads since you signed up.

I wanted to make sure you're actually seeing that activity,
because most agents are surprised by how much it does
while they're out showing homes.

Log in to see your numbers:
[link to /dashboard/analytics]

If there's something not working right, tell me —
I'd rather fix it than have you miss out on leads.

— Stojan, LeadFlow
```

**SMS — Inactive pilot, last attempt before pilot expires**

```
Hi [First Name], it's Stojan from LeadFlow.
Your pilot is still active but I haven't seen
you log in lately. Did it work out okay?
Happy to jump on a quick call if something
needs fixing. — Stojan
```

---

### 2.3 Outreach Templates — ACTIVE Pilots (Conversion Push)

**Email — Active pilot, AI has sent 5+ responses, no meeting booked yet**

```
Subject: Your AI has talked to [X] leads — here's what's next

Hi [First Name],

Your AI has responded to [X] leads so far —
all in under 30 seconds.

The next step is getting one of those conversations
to turn into a booked appointment.

Two things that help most:
1. Make sure your Cal.com link is in your AI settings
2. Check your AI's reply to any lead who responded
   and see if you want to adjust the tone

You're doing the hard part right. The conversion
is close.

Your pilot ends [date]. When you're ready to keep
your AI running, it's $149/month — and the setup
you've done carries over.

[ Keep My AI Running → ]

— Stojan, LeadFlow
```

**Email — ACTIVATED pilot (meeting booked + reviewed conversations 2x)**

```
Subject: You just proved the ROI — here's how to keep it

Hi [First Name],

Your AI booked [X] meeting(s) this month.

At the average commission for a closed deal in your market,
you need your AI to help close one additional deal per year
to pay for itself many times over. You're already on track.

Your pilot ends [date].

I'd love to get on a quick 15-minute call before then —
not to sell you, but to make sure you're getting the most
out of the setup before you decide.

[ Book a 15-Minute Call With Me ]

Or if you're ready now:
[ Upgrade to Pro — $149/month ]

Either way, you've earned it.

— Stojan, LeadFlow
```

**SMS — Active pilot, conversion-ready (meeting booked)**

```
Hi [First Name], Stojan from LeadFlow.
Your AI just booked a meeting — wanted to make
sure you saw it. Your pilot ends [date].
Want to do a quick 10-min call before then?
I'll make sure the setup is dialed in.
```

---

### 2.4 Outreach Timing Sequence

| Day | Trigger | Action |
|---|---|---|
| Day 1 (signup) | Auto | Welcome email + FUB setup guide |
| Day 3 | FUB not connected | Email: "one step away" |
| Day 7 | No AI activity | Email: inactive check-in |
| Day 7 | First meeting booked | Email: conversion push (activated template) |
| Day 10 | Active, no upgrade | Email: "your AI has talked to X leads" |
| Day 12 | Inactive, no response | SMS: personal check-in from Stojan |
| Day 14 | Pilot ending in 48h | Email: "your pilot ends in 2 days" |
| Day 14 | Pilot ending in 48h, activated | Email: activated conversion push |

---

## PART 3: PMF SIGNAL BRIEF — What to Watch

### 3.1 The Three Signals That Confirm PMF for This Cohort

**Signal 1 — Activation Rate**
*Definition:* % of pilots who have at least 1 AI response sent within 7 days of signup.
*Watch threshold:* If activation rate drops below 40%, the onboarding or FUB connection flow is the real product problem — fix that before any marketing spend.
*PMF confirmation level:* >60% activated within 7 days = strong signal.

**Signal 2 — Conversation Review Rate**
*Definition:* % of activated pilots who return to view AI conversations at least twice in their first 14 days.
*Why it matters:* Agents who check their AI's work are invested. Agents who never look are treating it as a black box — they'll churn the moment anything feels off. This is the engagement depth signal.
*Watch threshold:* <30% reviewing = agents don't trust the AI output yet. Address with in-app conversation quality highlights and "here's what your AI said" prompts.
*PMF confirmation level:* >50% reviewing conversations 2+ times = behavioral engagement confirmed.

**Signal 3 — Meeting-to-Pilot Ratio**
*Definition:* Total meetings booked by AI across all pilots ÷ number of active pilots.
*Why it matters:* This is the only signal that connects to real money. One meeting per pilot per month is the floor that makes the ROI case undeniable.
*Watch threshold:* If this ratio is below 0.5 (less than 1 meeting per 2 pilots per month), the AI qualification and SMS copy need review — the product is generating activity without outcomes.
*PMF confirmation level:* >1.0 meetings per active pilot per month = ROI self-evident, conversion should follow.

---

### 3.2 Signals That Deny PMF — Act Immediately

| Signal | What it means | What to do |
|---|---|---|
| <25% of pilots ever log in after signup | Acquisition problem masquerading as product — pilots signed up out of curiosity, not pain | Stop adding pilots; spend a week on direct calls to understand actual pain level |
| >60% pilots have FUB connected but 0 AI responses sent | Integration is broken or leads aren't flowing | Technical investigation P0 — every day this goes unfixed is wasted pilot capacity |
| 0 meetings booked across all pilots after 14 days | AI output quality or SMS copy is failing | Pull every AI conversation manually; do copy review with Stojan before next outreach cycle |
| Pilots log in once and never return | First session delivers no value — empty state problem | Implement lead simulator autoplay on first login; remove blank-dashboard experience entirely |
| Active pilots explicitly ask "how do I turn this off" | Noise without value — AI is responding but leads are low quality or copy is off | Audit lead source quality; add explicit lead filtering controls |

---

### 3.3 The One Number That Matters Most Right Now

With 21 pilots and $0 MRR, the single most important metric to track is:

**"How many pilots have seen their AI book at least one meeting?"**

If that number is 0 after 14 days of the pilot being active — the product has not delivered its core value proposition to a single paying-candidate human. Everything else is noise.

If that number is 3 or more — the ROI story is real, the outreach above will convert, and $20K MRR is achievable by Day 180.

Run this query weekly. Put the number in the Telegram heartbeat. Treat it as the cohort's pulse.
