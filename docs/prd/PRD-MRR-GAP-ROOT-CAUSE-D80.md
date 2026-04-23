# PRD: MRR Gap Root Cause — Phantom Metric & Real Path to $20K

**ID:** PRD-MRR-GAP-ROOT-CAUSE-D80  
**Status:** active  
**Priority:** P0  
**Date:** 2026-04-22  
**Author:** PM Agent  
**Task:** f7a5ae3b-2571-476f-b39d-195bc35d91bc

---

## 1. Key Finding: $597 MRR is Phantom Data

The genome reports MRR = $597. **This is entirely test data.** Real MRR = $0.

**Root cause:** Three rows were inserted into the `subscriptions` table during schema alignment testing:

| stripe_subscription_id | tier | implied MRR |
|------------------------|------|-------------|
| sub_test_schema_alignment_starter | starter | $49 |
| sub_test_schema_alignment_pro | pro | $149 |
| sub_test_schema_alignment_team | team | $399 |
| **Total** | | **$597** |

All three rows share `user_id = 00000000-0000-0000-0000-000000000001`, have no real Stripe customer data (`current_period_start/end = null`), and were created at the same second (2026-04-10T04:22:14). These are schema alignment fixtures, not real customers.

**The real MRR gap is $20,000 — not $19,403.**

---

## 2. Current Funnel State (Day 80)

| Stage | Count | Note |
|-------|-------|------|
| `real_estate_agents` in DB | 24 | Mix of test/invited/onboarding |
| `status = invited` | 20 | Pilot signups, not yet activated |
| `status = onboarding` | 3 | Started but stuck at step 0 |
| `status = active` | 1 | Test account |
| `onboarding_step = 99` (completed) | 3 | Completed onboarding |
| `subscriptions` active (real) | 0 | All active rows are test fixtures |
| Real MRR | **$0** | |

**Activation gap:** 21 of 24 agents are at onboarding_step=0. The product has never had a real paid customer.

---

## 3. What's Changed Since Day 79 PRD

The previous revenue analysis (`PRD-REVENUE-CRITICAL-D79.md`) identified the Stripe checkout regex as a critical blocker. **That bug was fixed** (commit 17ebf882, PR #1283) — `isValidPriceId()` now correctly validates price IDs with `{14,30}`. The checkout flow is no longer technically blocked.

Remaining blockers:
1. **A2P 10DLC compliance** — Twilio SMS delivery still blocked pending registration. Core product value unavailable.
2. **No real user base** — 24 DB records, mostly pilot signups who haven't been contacted
3. **MRR metric corrupted** — genome is tracking $597 as real MRR, masking the actual gap

---

## 4. Proposed Actions

### Action 1: Fix Phantom MRR Metric (Dev task, P1)
**What:** Delete the 3 test subscription rows OR add a query guard to exclude test stripe IDs.  
**Why:** The genome will continue making wrong assessments if it thinks $597 MRR exists.  
**Implementation:** 
- Option A: `DELETE FROM subscriptions WHERE stripe_subscription_id LIKE 'sub_test_%'` (1-line fix)
- Option B: Add `AND stripe_subscription_id NOT LIKE 'sub_test_%'` to the MRR query in the genome's revenue collector
- Prefer Option A — test data should not live in production DB

**UC created:** `fix-phantom-mrr-test-data-polluting-metric`

### Action 2: A2P 10DLC Registration (Stojan action required, P0)
**What:** Complete Twilio A2P 10DLC brand + campaign registration.  
**Why:** All SMS delivery is blocked. The product's core value prop — <30 second AI lead response — cannot be delivered until A2P is cleared.  
**Status:** Dashboard at `/admin/a2p` shows registration checklist. Steps: brand registration → campaign → messaging service → linking.  
**Owner:** Stojan must initiate — this requires manual Twilio console actions.  
**Timeline:** Registration takes 2-4 weeks; filing now = delivery by ~Day 110.

### Action 3: Activate Pilot Recruitment (P0 UC in-flight)
**What:** Contact the 20 invited agents in the DB and convert to active trials.  
**Why:** These are the warmest leads — they've already signed up. Zero have been contacted.  
**UC:** `fix-zero-real-pilots-recruited` (in_progress, marketing+dev workflow)  
**Expected outcome:** 3-5 active trials, 1 conversion candidate for Day 90 milestone

### Action 4: Trial-to-Paid Outreach (P1, immediate)
**What:** Once Action 3 generates active trial users, trigger the existing trial-to-paid email sequence.  
**Why:** Checkout is now unblocked (regex fixed). The sequence exists. Connect the two.  
**Dependency:** At least 1 real active trial user.

### Action 5: Update MRR Target in Genome (P2)
**What:** Confirm the `$20K MRR by Day 180` target in `project.config.json` is still the authoritative target.  
**Why:** If the genome computed a gap of $19,403 instead of $20,000, the metric query may also have a target rounding issue. Check `mission_metrics` and ensure target = 20000.

---

## 5. Revised Timeline to $20K MRR

| Phase | Window | Target | Key Action |
|-------|--------|--------|------------|
| First revenue | Day 80-90 (now → May 15) | 1 paying customer, $149+ MRR | Pilot outreach + personal conversion |
| Seed MRR | Day 91-120 | $500-$2K MRR | Trial email sequence + A2P if cleared |
| Ramp | Day 121-150 | $5K-$10K MRR | Channel activation, referrals |
| Target | Day 180 (Aug 13) | $20K MRR | ~134 Pro or ~50 Team customers |

**Realistic path to $20K:** Requires real product activation (A2P + onboarding), a working acquisition channel, and trial conversion. Achievable by Day 180 only if A2P is filed within the next 7 days.

---

## 6. Acceptance Criteria

- [ ] Test subscription rows deleted from `subscriptions` table (MRR metric shows $0 accurately)
- [ ] A2P 10DLC registration submitted by Stojan within 7 days
- [ ] At least 5 of the 20 invited agents contacted and offered trial activation
- [ ] At least 1 real paying subscriber by Day 90

---

*Generated by PM Agent — Day 80 of 180. Data pulled from local PostgreSQL as of 2026-04-22.*
