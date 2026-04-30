# Conversion Sprint — Day 73 Playbook

**Date:** 2026-04-29 (Day 73 of 90 — 17 days to milestone)
**Status:** $0 MRR. No real external signups. All infrastructure is built. Execution is the gap.

---

## What The Data Shows

| Metric | Value | What It Means |
|--------|-------|---------------|
| Real external signups | 0 | No one outside Stojan has used the product |
| Pilot targets identified | 20 | 0 contacted — all stuck at "identified" status |
| Pilot invites sent | 24 | 23 pending, 1 accepted (Stojan's test account) |
| Needs_merge PRs (revenue) | 4 | Built features not shipped: funnel tracking, campaign, pilot fix, revenue dashboard |
| A2P 10DLC | incomplete | SMS (core value prop) cannot be demonstrated |

The tools are built. The pipeline is ready. Distribution has not happened.

---

## Stojan — Required Actions This Week

### 1. Send the Outreach Blast (TODAY)
All 20 targets are loaded. Email templates are written. Demo links are ready.

**How:**
- Go to `/admin/outreach` in the dashboard
- Click "Send Outreach to All Identified Targets"
- Personalization is pre-filled from `pilot_recruitment_targets.notes`

**Reference:** `docs/design/CONTENT-BRIEF-pilot-outreach-email-blast.md`

**Target:** ≥5 replies or demo link clicks within 7 days.

---

### 2. Complete A2P 10DLC Registration (THIS WEEK)
**Why it's blocking everything:** Without A2P registration, Twilio cannot send SMS. The core product — 30-second AI response — cannot be demonstrated to anyone who signs up. Even if outreach succeeds and agents join the trial, they hit a dead end at the aha moment step.

**Twilio console:** Complete the brand + campaign registration. Estimated time: 45–60 min.
**Status:** UC `fix-a2p-10dlc-registration-incomplete` has been in_progress since Day ~50.

---

### 3. Personal Follow-Up on Any Responses
After blast sends, monitor Resend for opens/clicks. Within 24h of any click, send a personal follow-up from Stojan (not automated). Use the promo code `PILOT90` ($99 first month Pro) if they need a push.

---

## System — Requires Dev Action

### Unblock 4 Needs-Merge PRs
These features are built and QC-approved but blocked by merge conflicts:

| UC | Feature | Revenue Impact |
|----|---------|----------------|
| `uc-marketing-campaign-launch` | Acquisition campaign — 10+ signups/day | critical |
| `fix-zero-real-pilots-recruited` | Real pilot recruitment fix | critical |
| `feat-subscription-funnel-tracking` | Checkout abandonment recovery + funnel telemetry | high |
| `feat-revenue-funnel-visibility` | Revenue dashboard with MRR alerts | high |

All 4 need re-implementation from current main (branches have merge conflicts). The orchestrator should pick these up via `retryNeedsMergeUCs()`, but if they've been stuck, manual intervention may be needed.

---

## What NOT to Build

Do not build new features. The conversion path is complete:
- ✅ Trial signup → onboarding → FUB connect → aha moment → upgrade CTA
- ✅ Self-serve Stripe checkout (Pro $149, Starter $49)
- ✅ Personal upgrade offer tool (promo codes)
- ✅ Trial email sequences (welcome, day 3, day 7, expiry)
- ✅ Conversion call booking (Cal.com)
- ✅ Admin outreach blast tool

The only missing piece: real humans entering the funnel.

---

## Day 90 Done Definition (May 15)

| Gate | Target |
|------|--------|
| Outreach blast sent | All 20 identified targets contacted |
| Pilot signups | ≥3 real (non-Stojan) trial activations |
| A2P 10DLC | Registration submitted |
| MRR | ≥1 paying customer (any tier) |

If Day 90 passes at $0 MRR, the 4 needs_merge PRs must ship as immediate priority so the acquisition funnel works end-to-end for the Day 180 push.
