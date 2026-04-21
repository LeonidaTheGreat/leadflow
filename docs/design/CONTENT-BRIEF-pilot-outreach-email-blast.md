# Content Brief: Pilot Outreach Email Blast
**Task:** feat-pilot-outreach-email-blast  
**Date:** 2026-04-18  
**Author:** Marketing Agent  
**For:** Dev + Design teams

---

## Strategic Context

20 real agents are sitting in `pilot_recruitment_targets` at "identified" status. They have a publicly-documented pain — slow lead response. We know their names, locations, brokerages, and in most cases the exact post or complaint that put them on our list. This is warm outreach, not cold.

**The leverage:** Most of them already use Follow Up Boss (FUB), which is our integration hook. Several have *literally said* they want to "clone themselves" for lead response. We're not selling a feature — we're answering a complaint they already filed.

**The constraint:** 11 days to hit campaign milestone. This cannot be a "relationship nurture" email. It needs to move someone to click a demo link today.

---

## Audience Segmentation

Two meaningful segments in the 20 targets:

### Segment A: Solo Agents (15 people, Priority 1)
Core ICP. 12-25 transactions/year. Lose leads while showing properties. Decision is theirs alone.
- Amanda Foster, Brandon White, Christopher Davis, Emily Thompson, James Wilson, Jennifer Rodriguez, Jessica Martinez, Kevin O'Brien, Marcus Chen, Michael Brown, Michelle Garcia, Nicole Anderson, Robert Taylor, Sarah Mitchell, Stephanie Lee

### Segment B: Team Leads (5 people, Priority 2)
Higher volume, more complex needs, slightly longer decision cycle.
- Daniel Jackson, David Park, Lisa Wong, Rachel Kim, Ryan Patel

Use **Segment A template** for everyone. Segment B gets one sentence added in the personalization block (see below).

---

## Email Template

### Subject Lines (A/B test these two equally)

**Option A:** `{First_Name}, you mentioned this`  
**Option B:** `The agent who responds in 30 seconds gets the deal`

**Option A rationale:** Open rate play. References their own complaint without being creepy. Personal, curious-inducing.  
**Option B rationale:** Conviction play. Straight-line to the core value proposition. Works for tech-forward agents.

---

### Email Body (Segment A — Solo Agents)

---

**From:** Stojan Madjunkov <stojan@leadflowai.com>  
**Subject:** {subject_line}

---

Hi {first_name},

I saw your post about lead response — the one where you mentioned {pain_point_from_notes}.

That's exactly the problem LeadFlow was built to solve.

LeadFlow responds to incoming leads via SMS in under 30 seconds — while you're in a showing, on the road, or just off the clock. It plugs directly into Follow Up Boss, so your existing pipeline doesn't change. When a lead comes in, LeadFlow greets them, qualifies them, and books a call or showing on your Cal.com calendar. You just show up.

I'd like to give you free access to run a pilot this month.

No contract. No pitch call required. If it doesn't improve your response rate in 14 days, you walk away.

**[Start Your Free Pilot →]({demo_link})**

This link is just for you — it takes about 3 minutes to connect your FUB account and go live.

Stojan  
Founder, LeadFlow AI

---

### Email Body (Segment B — Team Leads)

Same as Segment A, but replace the paragraph starting "LeadFlow responds..." with:

---

LeadFlow responds to incoming leads via SMS in under 30 seconds — while your team is in showings, on other calls, or closed for the night. It routes leads to the right agent in your FUB pipeline automatically. When a lead comes in, LeadFlow greets them, qualifies them, and books appointments to the right calendar. Your team just shows up.

---

### Personalization Map

The `{pain_point_from_notes}` field is the most important personalization. Dev should pull the `notes` field and use a condensed version. Below is the exact copy to use per target — do not auto-summarize:

| Name | pain_point_from_notes value |
|------|----------------------------|
| Amanda Foster | missing leads because you couldn't respond fast enough |
| Brandon White | missing leads while you were in showings |
| Christopher Davis | needing a better system to catch leads between appointments |
| Emily Thompson | needing backup for lead response during your maternity leave |
| James Wilson | wanting to be the first agent to respond to every inquiry |
| Jennifer Rodriguez | running Facebook ads and losing leads to agents who respond faster |
| Jessica Martinez | wanting to respond to every lead the moment it comes in |
| Kevin O'Brien | needing a more consistent response system |
| Marcus Chen | wanting the kind of automated follow-up you had in your Salesforce days |
| Michael Brown | wanting to systematize your lead response so nothing falls through |
| Michelle Garcia | running Google Ads and wanting better lead response to protect your spend |
| Nicole Anderson | wanting to be first to respond to every lead inquiry |
| Robert Taylor | wanting to apply your tech background to make your process more efficient |
| Sarah Mitchell | wanting to clone yourself for lead response |
| Stephanie Lee | buying Zillow leads and losing them to agents who respond in seconds |
| Daniel Jackson | looking for automation tools to scale your team's lead handling |
| David Park | wanting to build out the systems side of your growing team |
| Lisa Wong | wanting AI tools that match the quality of your Compass brand |
| Rachel Kim | wanting to automate more of your process |
| Ryan Patel | wanting to modernize the systems in your family business |

---

## Demo Link Copy

The CTA button text: **"Start Your Free Pilot →"**

Below the button (smaller text): `Takes 3 minutes to connect. No credit card required.`

The `{demo_link}` is a unique URL generated per target via `POST /api/admin/demo-links`. It should route to the existing `/demo/[token]` page.

---

## Follow-Up Sequence (for dev to wire)

This brief covers the **initial send only**. If no response in 4 days, a follow-up is warranted. That's a separate task — do not build it now.

---

## Admin UI Content Brief (/admin/outreach page)

The page exists for one person: Stojan. It should answer:
1. Have I sent anything yet?
2. Who opened / who responded?
3. What's the next action?

### Page Header
`Pilot Outreach Campaign` — April 5 – May 5, 2026

### Stats Bar (4 numbers)
| Label | Value | Color |
|-------|-------|-------|
| Identified | count where status = 'identified' | Gray |
| Contacted | count where status = 'contacted' | Blue |
| Responded | count where status = 'responded' | Orange |
| Signed Up | count where status = 'signed_up' | Green |

### Action Button
**Primary CTA:** `Send Outreach to All Identified Targets`  
Calls `POST /api/admin/outreach/blast`

Button copy when some already contacted: `Send to Remaining {N} Targets`  
Button state after blast fires: `Sending...` (disabled) → `Sent to {N} targets` (success)

### Target Table
Columns: Name | Location | Brokerage | Status | Last Touch | Actions  
Status pill colors: identified=gray, contacted=blue, responded=orange, signed_up=green

No pagination needed — 20 rows max.

### Empty / Error States
- No targets: `No identified targets found. Add targets to the campaign first.`
- Blast error: `Failed to send to {N} targets. Check server logs.`
- Partial send: `Sent to {success} of {total} targets. {failed} failed — see logs.`

---

## Copy Rules for Dev Implementation

1. **From name:** `Stojan Madjunkov` — not "LeadFlow AI" or "The Team"
2. **Tone:** Personal, direct, zero marketing-speak. Never: "solutions," "leverage," "synergy," "streamline."
3. **Subject line implementation:** Send Option A (the `you mentioned this` variant) to all targets. Save Option B for a future re-engagement send if open rate is low.
4. **No unsubscribe footer needed** for this first send — these are individual, personalized emails, not a mass blast legally. But include a plain-text P.S. if Resend requires it: `P.S. Reply to this email anytime — this goes directly to me.`
5. **Signature block:** No logo, no banner, no social icons. Just the name and title.

---

## Success Metric for This Campaign

**Primary:** ≥5 of 20 targets reply or click demo link within 7 days  
**Secondary:** ≥2 active demo sessions started within 14 days  
**Conversion target:** ≥1 paid subscriber by Day 90 (May 15) sourced from this list

---

*This brief is the source of truth for copy. Dev implements the blast endpoint and admin page. Design is not required for this task — the admin page should use existing component styles.*
