# PRD: Pilot Conversion Sprint — Direct Outreach to 15 Pilot Agents

**Status:** Approved  
**Version:** 2.0  
**Use Case:** uc-pilot-conversion-sprint-direct-outreach  
**Created:** 2026-05-02  
**Updated:** 2026-05-02 — corrected agent count (11→15), data source, tool availability  
**Owner:** Stojan (personal execution — no dev agent)

---

## Context

Day 79 of 90. First paying customer deadline: 2026-05-15 (13 days).  
MRR: $0.

**Verified 2026-05-02 from `pilot_signups` table:**
- 15 real agents submitted pilot applications
- All 15 have email + phone on file
- 0 conversion calls made
- These agents are NOT yet in `real_estate_agents` — they are warm prospects

This is not a code task. It is a 48-hour personal outreach sprint.

---

## Goal

Convert at least 1 pilot agent to a paying subscriber before 2026-05-15 by personally contacting all 15 within 48 hours with a personalized, time-limited upgrade offer.

---

## What Actually Exists (verified 2026-05-02)

| Tool | Where | Status |
|------|-------|--------|
| Promo code engine | `StripeService.createPromoCode()` | ✅ Works |
| Promo code table | `promo_codes` in local PG | ✅ Exists |
| Pilot signup list | `pilot_signups` table (15 real agents) | ✅ All have email + phone |
| Stripe Dashboard | dashboard.stripe.com | ✅ Manual promo code creation |
| **Admin upgrade offer API** | `POST /api/admin/send-upgrade-offer` | ❌ Does NOT exist — use Stripe Dashboard instead |

**Do NOT use `pilot_progress` table or `/admin/pilots` page** — they contain only test accounts.  
**Do NOT use `real_estate_agents`** — only 1 real pilot-tier entry there (a smoke test).

---

## Call Sheet (pre-filled from `pilot_signups`)

| # | Name | Email | Phone | City | Called? | Outcome | Code | Converted? |
|---|------|-------|-------|------|---------|---------|------|------------|
| 1 | Abha Sethi | abha@ahomenearaustin.com | (512) 636-7379 | Austin, TX | | | | |
| 2 | Ajay Rai | ajayrairealtor@gmail.com | (512) 689-0218 | Austin, TX | | | | |
| 3 | Alexandra Booth | alex@alexandrabooth.com | (512) 554-4147 | Austin, TX | | | | |
| 4 | Natalie Freeman | nataliedfreeman@gmail.com | (512) 296-8805 | Austin, TX | | | | |
| 5 | Talia Tovar | taliasellsdfw@gmail.com | (972) 375-5453 | Dallas, TX | | | | |
| 6 | Amber English | amber@dealswithamber.com | (214) 771-1889 | Dallas, TX | | | | |
| 7 | Alexandria Aymelek | alex@alexsellsdfw.com | (972) 890-5430 | Dallas, TX | | | | |
| 8 | Alma Delia Lopez | dfw@realestatebyalma.com | (214) 753-9285 | Dallas, TX | | | | |
| 9 | Jenny Wu | jenwurealestate@gmail.com | (678) 358-1698 | Atlanta, GA | | | | |
| 10 | Dani Stewart | danistewart90@gmail.com | (404) 808-5462 | Atlanta, GA | | | | |
| 11 | Ashli Taylor | ashlitaylor12@gmail.com | (770) 375-5881 | Atlanta, GA | | | | |
| 12 | Bridget Strategos | bridgetstrategos@gmail.com | (678) 779-3119 | Atlanta, GA | | | | |
| 13 | Ashley Misiuda | ashley@theagencycharlotte.com | (704) 249-9564 | Charlotte, NC | | | | |
| 14 | Alivia Wright | alivia@theagencycharlotte.com | (980) 425-2273 | Charlotte, NC | | | | |
| 15 | Pamela Manwaring | pamela@domidesert.com | (602) 515-3800 | Phoenix, AZ | | | | |

Start with Austin (4 agents, same metro). Then Dallas, Atlanta, Charlotte, Phoenix.

---

## Execution Plan

### Step 1 — Generate Promo Codes Before Calls (~30 min)

Since `POST /api/admin/send-upgrade-offer` does not exist, use **Stripe Dashboard**:

1. Go to **dashboard.stripe.com → Coupons → Create coupon**
   - Discount: 50% off
   - Duration: Once
   - Max redemptions: 1
   - Expiry: 3 days from today

2. Name codes `PILOT-[FIRSTNAME]-50` (e.g., `PILOT-ABHA-50`). Create one per agent.

3. Log each into local PG immediately after creating in Stripe:

```sql
INSERT INTO promo_codes (stripe_promo_code_id, stripe_coupon_id, code, discount_percent, tier, expiry_at, metadata)
VALUES (
  'prmo_xxxx',  -- from Stripe
  'co_xxxx',    -- from Stripe
  'PILOT-ABHA-50',
  50,
  'pro',
  NOW() + INTERVAL '72 hours',
  '{"pilot_name": "Abha Sethi", "source": "direct_call_sprint_2026_05"}'::jsonb
);
```

> **Dev task created in parallel:** `uc-admin-upgrade-offer-tool` — build `POST /api/admin/send-upgrade-offer` to automate this in future sprints.

---

### Step 2 — The Call Script

**Opening (20 sec):**
> "Hey [Name], this is Stojan — I'm the founder of LeadFlow AI. You submitted interest in our pilot a few weeks ago. I'm personally calling everyone this week because I have a one-time offer just for pilot members."

**Product pitch (20 sec):**
> "LeadFlow responds to your leads in under 30 seconds via SMS, qualifies them, and books the appointment to your calendar. Integrates with Follow Up Boss."

**The offer (30 sec):**
> "I'm giving all pilot members 50% off their first month on Pro — that's $75 instead of $149. I'll email you a promo code right now. It's good for 72 hours."

**If ready:**
> "Great — sign up at leadflow-ai-five.vercel.app/signup and enter your code at checkout. I'll stay on while you do it."

**If wants to think:**
> "Fair. Code expires [date/time]. Can I book 15 minutes for a live demo? You'll know in 10 minutes whether it's worth paying for."

**If hasn't tried it:**
> "Let's get you set up before we talk paying. Can I do a 10-minute screen share now? Once you see a lead responded to in 30 seconds, you'll have what you need to decide."

**Voicemail:**
> "Hey [Name], Stojan here — founder of LeadFlow AI. You submitted for our pilot. I have a 50% off offer just for pilot members — good 72 hours. Sending you an email with the code. Call back at [your number] or just reply."

---

### Step 3 — Send Promo Code Email (immediately after each call)

Send from stojan@landyourleads.com:

**Subject:** Your LeadFlow pilot code, [Name] — good 72h

**Body:**
```
Hey [Name],

[Great talking / I just tried to reach you —] here's your personal offer:

Code: PILOT-[FIRSTNAME]-50
50% off your first month on Pro ($75 instead of $149)
Expires: [date/time 72h from now]

Sign up: https://leadflow-ai-five.vercel.app/signup
Enter the code at checkout. Takes 5 minutes.

Reply here if you hit anything.

— Stojan
Founder, LeadFlow AI
```

---

### Step 4 — Post-Call Logging

After each call:

1. Track outcome in call sheet: `reached` / `voicemail` / `interested` / `converted` / `declined`
2. Mark follow-up sent in DB:
   ```sql
   UPDATE pilot_signups SET follow_up_sent = true WHERE email = 'agent@example.com';
   ```
3. When they sign up, link promo code to their new account:
   ```sql
   UPDATE promo_codes
   SET agent_id = (SELECT id FROM real_estate_agents WHERE email = 'agent@example.com')
   WHERE code = 'PILOT-XXX-50';
   ```

---

### Step 5 — 24h Follow-Up

Text from personal phone to voicemails / no-converts:

> "Hey [Name], Stojan from LeadFlow. Sent you a 50% pilot offer by email. Expires [date]. Happy to chat — reply here or call [your number]."

---

## Acceptance Criteria

### AC-1: All 15 pilots contacted within 48h
- Every agent in call sheet dialed or texted
- Outcome logged for each

### AC-2: 15 promo codes created and emailed
- 15 codes in Stripe Dashboard
- 15 rows in `promo_codes` table
- Promo email sent to every agent

### AC-3: At least 1 conversion by 2026-05-15
- At least 1 `promo_codes.redeemed = true`
- Corresponding `real_estate_agents.subscription_status = 'active'`

### AC-4: Retrospective completed within 72h of sprint end
- 1-page summary: reach rate, objections heard, conversion count
- PMF.md updated with objections

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Agents contacted | 15/15 within 48h |
| Live answer rate | ≥ 6/15 (40%) |
| Reply/callback rate | ≥ 8/15 (53%) |
| Demos booked | ≥ 3/15 |
| Conversion | ≥ 1 |
| MRR gained | ≥ $75 (1× Pro at 50% off) |

---

## Risk: 0 Conversions After 15 Calls

1. Within 24h: Call back 2-3 most engaged — ask "What would need to be true for you to pay $75/month?"
2. Document objections: price? integration friction? not enough leads? hasn't seen it work?
3. PMF pivot signals:
   - Consistent price objection → test $29 Starter tier
   - Consistent "haven't tried it" → activation-first strategy before asking for money
   - Consistent "not enough leads" → ICP recalibration toward higher-volume agents

The sprint fails only if we don't learn something actionable.

---

## Dev Dependency (parallel, non-blocking)

**UC:** `uc-admin-upgrade-offer-tool`  
**What:** `POST /api/admin/send-upgrade-offer` — given `{agent_id, discount_percent, tier, expiry_days}`, creates Stripe promo code, sends branded email, logs to `promo_codes` + `email_events`  
**Wire:** `StripeService.createPromoCode()` + `EmailService.sendUpgradeOffer()` (method needs building)  
**Effort:** ~4-6h  
**Priority:** P1 — required for next outreach sprint  

---

## Timeline

| Time | Action |
|------|--------|
| T+0 | Create 15 promo codes in Stripe Dashboard. Insert into `promo_codes` table. |
| T+0 to T+24h | Call all 15. Aim 8+ same day. Start Austin (area code 512). |
| T+24h to T+48h | Text follow-ups on voicemails. Book screen shares for interested. |
| T+72h | Codes expire. |
| T+72h | Write retrospective. Update PMF.md with objections heard. |
