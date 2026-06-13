# Revenue Gap Analysis — 2026-06-12

**Task:** 32c41998-dcff-40a6-880d-c16a6a27e907  
**Date:** 2026-06-12  
**Milestone:** First paying customer by 2026-07-01 / $20K MRR by 2026-08-13

## Funnel Snapshot (as of 2026-06-12)

| Stage | Count | Rate |
|---|---|---|
| Total registered agents | 56 | — |
| Email verified | 26 | 46% |
| Onboarding completed | 4 | 7% |
| Aha moment (AI response demo) | 1 | 2% |
| Active trial | 0 | 0% |
| Paying | 0 | 0% |

Real pilot signups (pilot_signups table): **0** — all 21 rows are @example.com test data.

## Critical Gaps Identified

### P0: Email Verification Wall (30 agents locked out)
- 30 agents cannot access the product — email verification emails were never delivered (Resend domain not verified, blocked_human)
- `uc-admin-email-verify-override` already defined but was priority 1 / not_started
- **Action:** Bumped to priority 0

### P0: Invite Accept Flow Returns 409 for All Real Invites
- Product review 4e15663a verdict: **FAIL**
- `invite-pilot` route pre-sets `invite.agent_id` at creation time; `accept-invite` route checks `if(invite.agent_id) → 409 "already processed"` for every invite
- 9 real pending invites in DB are permanently blocked
- No password-set step — even if 409 were fixed, agents couldn't log in
- `feat-admin-pilot-invite-flow` is marked `complete` in DB but is non-functional
- **New UC created:** `fix-invite-accept-409-broken-recruitment` (priority 0, critical)

### P0: UC-8 Lead Sequences Empty (25 leads, 0 in automated follow-up)
- Product review c012f79c verdict: **FAIL**
- `lead_sequences` table has 0 rows despite 25 leads in `leads` table
- `/api/cron/follow-up` reads `lead_sequences` but nothing enrolls leads into it
- Core product value (automated SMS lead nurturing) is completely inactive
- **New UC created:** `fix-uc8-lead-sequence-enrollment-empty` (priority 0, critical)

### P0: Stripe Checkout Blocked (4 onboarded agents cannot pay)
- Vercel ENV has placeholder price IDs (`price_starter_49`) not real Stripe IDs
- `fix-stripe-price-ids-are-placeholder-values-not-real-s` is `needs_merge` but not deployed
- `uc-stripe-payment-link-direct` (bypass path) was priority 1 / not_started
- **New UC created:** `fix-stripe-real-price-ids-and-checkout-unblock` (priority 0, critical)  
- **Action:** `uc-stripe-payment-link-direct` bumped to priority 0

### P1: No Real Pilot Signups
- All 21 pilot_signups are @example.com test data
- Pilot capture mechanism works but no real agents are entering the top of funnel
- Root cause: marketing outreach hasn't driven real signups — blocked_human

## Use Cases Created

| UC ID | Name | Priority | Revenue Impact |
|---|---|---|---|
| `fix-invite-accept-409-broken-recruitment` | Fix Admin Invite Accept Flow — 409 Blocks All 9 Pending Invites | 0 | critical |
| `fix-uc8-lead-sequence-enrollment-empty` | Fix UC-8 Lead Sequence Enrollment — 25 Leads, 0 in Sequences | 0 | critical |
| `fix-stripe-real-price-ids-and-checkout-unblock` | Stripe Checkout Unblock — Merge Price ID Fix + ENV Validation Endpoint | 0 | critical |

## Use Cases Reprioritized

| UC ID | Old Priority | New Priority | Reason |
|---|---|---|---|
| `uc-admin-email-verify-override` | 1 | 0 | 30 locked agents — largest single funnel drop-off |
| `uc-stripe-payment-link-direct` | 1 | 0 | 4 agents ready to pay — fastest path to first dollar |

## Recommended Focus

**Immediate (this sprint):**
1. `uc-admin-email-verify-override` — pure dev work, no third-party config, unblocks 30 agents TODAY
2. `uc-stripe-payment-link-direct` — no Vercel ENV changes needed, could collect first payment within 48h from the 4 onboarded agents
3. `fix-invite-accept-409-broken-recruitment` — restores Stojan's primary recruitment tool

**Top 1 thing to unblock revenue:** Ship `uc-admin-email-verify-override`. 30 agents signed up and want to try the product. They're locked out by a broken email delivery system. An admin override page lets Stojan manually verify their emails in one click — no email infrastructure changes needed. This converts a 46% verification rate into a potential 100% for existing signups overnight.
