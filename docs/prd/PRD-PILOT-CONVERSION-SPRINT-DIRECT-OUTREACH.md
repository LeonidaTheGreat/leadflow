# PRD: Pilot Conversion Sprint — Direct Outreach to 11 Pilot Agents

**Status:** Approved  
**Version:** 1.0  
**Use Case:** uc-pilot-conversion-sprint-direct-outreach  
**Created:** 2026-05-02  
**Owner:** Stojan (personal execution — no dev agent)

---

## Context

Day 79 of 90. First paying customer deadline: 2026-05-15 (13 days).  
MRR: $0. Pilot agents: 11. Conversion calls made: 0.

The upgrade tools are built. The email sequences exist. The promo code system is live.  
**The missing piece is Stojan picking up the phone.**

This is not a code task. It is a 48-hour personal outreach sprint.

---

## Goal

Convert at least 1 pilot agent to a paid subscription before 2026-05-15 by personally contacting all 11 within 48 hours with a time-limited, personalized upgrade offer.

---

## What Already Exists (use these — no new code needed)

| Tool | Where | Purpose |
|------|-------|---------|
| Pilot dashboard | `leadflow-ai-five.vercel.app/admin/pilots` | See each pilot's stage, usage stats, last login |
| Upgrade offer tool | `POST /api/admin/send-upgrade-offer` (auth: `LEADFLOW_API_KEY`) | Generate promo code + send branded email |
| Promo code table | `promo_codes` (local PG) | Tracks generated codes, expiry, redemption |
| Pilot progress | `pilot_progress` table | Tracks stage: `signed_up → aha_moment → trial_started → paid` |

---

## Execution Plan

### Step 1 — Build the Call Sheet (before first call)

Access the admin pilots dashboard. For each of the 11 pilots, record:

| Field | Where to find |
|-------|--------------|
| Name, email, phone | `/admin/pilots` |
| Stage | `pilot_progress.stage` |
| Last login | `real_estate_agents.last_login_at` |
| Aha moment reached? | Stage = `aha_moment` |
| Response time (if leads responded to) | `sms_messages` for that agent |

Prioritize outreach order:
1. **Highest priority:** agents at `aha_moment` stage (they've seen the product work)
2. **Second:** agents at `fub_connected` or `first_lead_responded`
3. **Third:** agents at `signed_up` only (haven't activated yet — address that first)

---

### Step 2 — Generate Personalized Promo Codes (before each call)

For each pilot, generate a code via:

```
POST https://api.imagineapi.org/api/admin/send-upgrade-offer
Authorization: Bearer <LEADFLOW_API_KEY>
Content-Type: application/json

{
  "agent_id": "<agent UUID from dashboard>",
  "discount_percent": 50,
  "tier": "pro",
  "expiry_days": 3,
  "personal_note": "Hey [Name], this is just for you — 50% off Pro for your first month. Valid for 72 hours."
}
```

This creates a Stripe promo code (logged in `promo_codes`), sends a branded email with the code, and returns the code for use in the phone call.

**Offer terms:** 50% off first month on Pro ($149 → ~$75). 72-hour expiry from time of call.

---

### Step 3 — The Call Script

**Opening (20 seconds):**
> "Hey [Name], this is Stojan from LeadFlow AI — you signed up for our pilot program [X days] ago. I'm personally calling every pilot this week because I want to make sure you're getting value and I have something for you."

**Transition (30 seconds):**
> "Quick question — have you had a chance to [connect your FUB / see the AI respond to a lead]? I can see from our system [describe their actual usage — e.g., 'you had 3 leads come in last week' or 'you haven't connected FUB yet, let me help you do that right now in 2 minutes']."

**The offer (30 seconds):**
> "Here's why I'm calling: I'm giving all 11 pilot agents a personal deal — 50% off Pro for your first month. That's [~$75 vs $149]. I just sent you an email with your promo code. It's valid for 72 hours. I'd rather you pay $75 and see if it works for you than walk away without trying it properly."

**Close options:**

*If they're ready:*
> "The upgrade link is in the email I just sent. It takes 2 minutes on Stripe. Any questions before you click it?"

*If they want to think:*
> "Totally fair. The code in your email is good until [date]. One thing — if you want, I can book 15 minutes for us to go through your first lead together. Would that help?"

*If they haven't activated:*
> "Before we talk about upgrading, let's get you connected. Can you share your screen with me for 10 minutes? I'll walk you through FUB setup right now. Once you see your first lead respond in 30 seconds, you'll know whether this is worth paying for."

**Voicemail script:**
> "Hey [Name], Stojan from LeadFlow AI. I'm calling personally — sent you an email with a 50% off offer just for pilot members. Good for 72 hours. Would love to catch up. Call me back at [number] or just reply to the email."

---

### Step 4 — Post-Call Actions

After each call, within 5 minutes:

1. **Log the contact** in `/admin/pilots` → select agent → Log Contact (type: `phone`)  
   Note the outcome: `interested`, `not_ready`, `need_activation_help`, `no_answer`, `declined`

2. **If they want activation help:** book a 15-min screen share via Cal.com  
   Use the conversion call booking link: `/admin/outreach`

3. **Update pilot_progress stage** if it changed (e.g., moved from `signed_up` to `aha_moment`)

---

### Step 5 — Follow-Up (48 hours after call, if no conversion)

Send a personal text (via Twilio or iMessage — whichever feels right):

> "Hey [Name], Stojan here. Just wanted to follow up — your LeadFlow promo code expires tomorrow. Happy to jump on a quick call if you have questions. [link to upgrade page]"

---

## Call Sheet Template

| # | Name | Email | Phone | Stage | Last Login | Called? | Outcome | Code Sent? | Converted? |
|---|------|-------|-------|-------|------------|---------|---------|------------|------------|
| 1 | | | | | | | | | |
| 2 | | | | | | | | | |
| ... | | | | | | | | | |

Fill this from `/admin/pilots` before starting. Track outcomes in real time.

---

## Acceptance Criteria

### AC-1: All 11 pilots contacted within 48h
- Every pilot has an entry in `pilot_progress.last_contact_at` updated within 48h of PRD execution start
- Contact type logged: `phone` (preferred), `sms`, or `email` (last resort)

### AC-2: Promo codes generated for all 11
- 11 rows in `promo_codes` table with `agent_id` matching each pilot
- `discount_percent = 50`, `tier = 'pro'`, `expiry_at` set to 72h from send time
- Email sent flag: `email_events` has `email_type = 'upgrade_offer'` for each agent

### AC-3: At least 1 conversion
- At least 1 `promo_codes.redeemed = true` within the sprint window
- Corresponding `real_estate_agents.subscription_status = 'active'`
- `mrr_snapshots` updated

### AC-4: Activation-blocked pilots unblocked
- Any pilot at `signed_up` stage who hasn't connected FUB → either:  
  (a) screen share booked (booking in Cal.com), or  
  (b) marked `declined` with reason logged

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Pilots contacted | 11/11 within 48h |
| Promo emails sent | 11/11 |
| Reply/callback rate | ≥ 5/11 (45%) |
| Conversion from sprint | ≥ 1 |
| MRR from sprint | ≥ $75 (1× Pro at 50% off) |

---

## Risk: What If Nobody Converts?

If 0 conversions after 11 calls:

1. **Root cause audit within 24h:** Call back the 2-3 most engaged and ask directly: "What would need to be true for you to pay $75/month for this?"
2. **Document objections:** Price? Missing feature? Doesn't trust it yet? Integration friction?
3. **Escalate to PMF review:** If consistent objection to price → consider $29 starter offer. If consistent "not enough leads" → focus on activation, not conversion.

The sprint fails only if we don't learn something actionable.

---

## Timeline

| Time | Action |
|------|--------|
| T+0 (now) | Pull call sheet from `/admin/pilots`, generate all 11 promo codes |
| T+0 to T+24h | Call all 11 pilots. Aim for 5+ same day. |
| T+24h to T+48h | Follow up on no-answers. Book activation help for stuck pilots. |
| T+72h | Promo codes expire. Review outcomes. |
| T+72h | Write 1-page retrospective: who converted, who didn't, why |
