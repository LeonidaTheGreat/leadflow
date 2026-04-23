# PRD: Paying Customers Gap — Execution Update (Day 80)

**ID:** PRD-PAYING-CUSTOMERS-EXECUTION-D80
**Status:** active
**Priority:** P0
**Date:** 2026-04-22
**Author:** PM Agent
**Task:** 2030a876-e7be-4aef-ae2b-733be8a8078e
**Depends on:** PRD-MRR-GAP-ROOT-CAUSE-D80 (diagnosis), PRD-STRIPE-CHECKOUT-E2E (validation spec)

---

## What Changed Since D80 Diagnosis

**PRD-MRR-GAP-ROOT-CAUSE-D80** (written yesterday) correctly diagnosed the root causes. This PRD adds execution status.

### Fixed: Stripe checkout regex (commit 17ebf882, Apr 21)

`isValidPriceId()` in `create-checkout/route.ts` had `{14 }` (space in quantifier) — always returned false, blocking every checkout session. Fixed to `{14,30}`. E2E test committed in 3b1ffabd.

**UC `fix-checkout-regex-blocks-all-payments` is complete — should be marked as such to avoid redundant dev work.**

### Unchanged: Real MRR is $0

Three test subscription rows (`sub_test_schema_alignment_*`) still exist in the `subscriptions` table, showing phantom $597 MRR. UC `fix-phantom-mrr-test-data-polluting-metric` is "ready" with no dev task assigned.

---

## The Actual Blocking Chain

All paths to first revenue converge on three human actions Stojan must take. Dev infrastructure is either built or building — the bottleneck is not code.

```
Stojan verifies Resend domain → emails deliver → trial activation works → pilots onboard
                                                                         ↓
Stojan contacts 20 invited agents → real users enter system → conversion candidates exist
                                                            ↓
Stojan files A2P 10DLC → SMS works → core product demonstrated → pilots see value → convert
```

### Human Action 1: Verify leadflow.ai in Resend (30 minutes, HIGHEST ROI)

**UC:** `fix-email-delivery-resend-from-domain-not-verified` (P1, in_progress)

368 email events recorded. 0 delivered. All fail: *"You can only send testing emails to your own email address."* The `FROM_EMAIL` env var is unset in Vercel, causing fallback to `onboarding@resend.dev` (Resend shared test domain — only delivers to the API key owner).

**Steps:**
1. Go to resend.com/domains → Add `leadflow.ai` → Add DNS records (Vercel DNS panel)
2. Set `FROM_EMAIL=onboarding@leadflow.ai` in Vercel project `leadflow-ai` → redeploy
3. Verify: create test account, confirm welcome email arrives

**Impact:** Unblocks welcome emails, trial activation, conversion nudges, pilot invites. Without this, no email-triggered flow works.

### Human Action 2: Contact the 20 invited agents (1-2 hours, FASTEST PATH TO REVENUE)

**UCs:** `fix-zero-real-pilots-recruited` (P0), `fix-pilot-outreach-has-not-happened-11-days-left` (P1), `fix-30-pilot-campaign-stalled-at-day-8` (P99) — all the same underlying problem.

20 real estate agents are in the DB at `status = invited`. Zero have been contacted in 80 days. These are the warmest leads in the system.

**Steps:**
1. Run: `SELECT name, email FROM real_estate_agents WHERE status = 'invited' LIMIT 20;`
2. Send personal email to each: intro, offer white-glove trial setup, 15-min Zoom
3. For any who respond: guide them through FUB integration + onboarding wizard

**Impact:** Real users → conversion candidates. Without real users, the trial-to-paid flow has no one to convert.

**Note:** Three overlapping UCs exist for this problem. Consolidate: keep `fix-zero-real-pilots-recruited` (P0), cancel the other two to stop splitting dev compute.

### Human Action 3: File A2P 10DLC with Twilio (30 minutes now → SMS in ~Day 110)

**UC:** `fix-a2p-10dlc-registration-incomplete` (P2, in_progress)

All SMS delivery is blocked pending A2P brand + campaign registration. The product's core value prop — AI responds to leads in <30 seconds — cannot be demonstrated without SMS.

**Steps:**
1. twilio.com/console → Messaging → Regulatory Compliance → Brand Registration
2. Submit brand, then submit campaign (use case: customer care / marketing)
3. Link to messaging service

**Impact:** Without A2P, pilots cannot experience product value. No product value = no conversion rationale. Filing today → approval ~Day 110 → product demos possible Day 110+.

---

## UC Pipeline Health Assessment

### Needs Immediate Action (Merge Queue)

| UC | Status | Action |
|----|--------|--------|
| `feat-subscription-funnel-tracking` | needs_merge | Merge — checkout abandonment recovery ready |
| `feat-revenue-funnel-visibility` | needs_merge | Merge — funnel visibility is critical for targeting |
| `uc-marketing-campaign-launch` | needs_merge | Merge — acquisition channel activation |

### Stale UCs (Already Complete)

| UC | Status | Reality |
|----|--------|---------|
| `fix-checkout-regex-blocks-all-payments` | in_progress | Fixed in commit 17ebf882 — mark complete |

### Ready UC Needing Dev Task

| UC | Status | Fix |
|----|--------|-----|
| `fix-phantom-mrr-test-data-polluting-metric` | ready | `DELETE FROM subscriptions WHERE stripe_subscription_id LIKE 'sub_test_%'` — 1-line fix, high value |

### Duplicate UCs to Consolidate

Three UCs describe the same problem (zero pilots contacted):
- `fix-zero-real-pilots-recruited` (P0) — keep
- `fix-pilot-outreach-has-not-happened-11-days-left` (P1) — cancel
- `fix-30-pilot-campaign-stalled-at-day-8` (P99) — cancel

---

## Priority Order for Next 10 Days

1. **Stojan: verify Resend domain** — 30 min, unblocks all email communication
2. **Merge `feat-subscription-funnel-tracking`** — see checkout abandonment
3. **Merge `feat-revenue-funnel-visibility`** — funnel visibility
4. **Dev: fix phantom MRR** (`fix-phantom-mrr-test-data-polluting-metric`) — 1-line SQL, correct metrics
5. **Stojan: contact 10 of 20 invited agents** — first real conversion candidates
6. **Stojan: file A2P 10DLC** — core product delivery, 2-4 week lead time

---

## Realistic Revenue Outlook

| Scenario | By Day 90 | By Day 120 | By Day 180 |
|----------|-----------|------------|------------|
| No A2P, no outreach | $0 | $0 | <$500 |
| Outreach only, no A2P | $149-$449 (1-3 pilots) | $500-$1K | $2K-$5K |
| A2P + outreach | $149-$449 | $1K-$3K | $10K-$20K |

$20K MRR by Day 180 requires ~134 Pro customers. Achievable only with: A2P filed now, active acquisition channel by Day 100, trial-to-paid email sequence working.

---

## Acceptance Criteria

- [ ] `fix-checkout-regex-blocks-all-payments` marked `complete` in DB
- [ ] `feat-subscription-funnel-tracking` merged to main
- [ ] `feat-revenue-funnel-visibility` merged to main
- [ ] `fix-phantom-mrr-test-data-polluting-metric` dev task spawned and completed (MRR shows $0)
- [ ] Resend domain verified, `FROM_EMAIL` set in Vercel (Stojan)
- [ ] At least 5 of 20 invited agents personally contacted (Stojan)
- [ ] A2P 10DLC filing initiated in Twilio console (Stojan)

---

*PM Agent — Day 80 of 180. Data: local PostgreSQL as of 2026-04-22.*
