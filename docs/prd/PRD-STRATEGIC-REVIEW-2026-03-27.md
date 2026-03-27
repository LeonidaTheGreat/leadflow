# PRD: Daily Strategic Review — 2026-03-27

**ID:** PRD-STRATEGIC-REVIEW-2026-03-27  
**Type:** Orchestrator Process Review  
**Date:** 2026-03-27  
**Author:** Product Manager  

---

## Executive Summary

At Day ~22 of a 60-day pilot runway, the system has **260 UCs, 223 complete (86%)**, but critical production blockers are preventing the product from functioning as a revenue-generating business. Stripe billing is completely broken in Vercel production. Email is non-functional. Zero real agents have been recruited. The system is building features while the foundation leaks.

---

## Current State Assessment

### UC Breakdown
| Priority | Complete | Not Started | In Progress |
|----------|----------|-------------|-------------|
| P0       | 17       | 6           | 0           |
| P1       | 87       | 22          | 2           |
| P2       | 94       | 29          | 0           |
| P3       | 2        | 1           | 0           |
| **Total**| **200**  | **58**      | **2**       |

### Critical Observation: UC Duplication Problem
There are **10+ duplicate Stripe env var UCs** (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, RESEND_API_KEY). The smoke handler is detecting the same issues repeatedly and creating new UCs instead of updating existing ones. This inflates the UC count and creates misleading "progress" signals.

### Stale Zombie Tasks Cancelled
Four PM tasks stuck in `in_progress` for 65–68 hours were cancelled:
- PM: Product Review — Start Free Trial CTA (68h stale)
- PM: Product Review — Landing Page Analytics GA4 (66h stale)
- PM: Product Review — Lead Satisfaction Feedback (65h stale)
- PM: Proactive Revenue Gap Analysis (16h stale)

---

## Strategic Decisions

### 1. Priority Adjustments

**Escalate "feature not deployed" UC to P0:**
- UC: `fix-feature-not-deployed-all-new-routes-return-404-on-`
- Reason: All new code producing 404s in Vercel means ALL P1/P2 dev work is invisible to real users. Every completed dev task is wasted until deployment works.

**Stripe + Email env vars are effectively P0:**
- Multiple P1 UCs for Stripe and email env var gaps in Vercel should be treated as a single P0 blocker: **billing is broken, email is broken = product cannot convert anyone**.
- The system should deduplicate these into a single canonical UC.

### 2. Process Issues

1. **Duplicate UC creation**: The smoke handler creates new UCs every heartbeat for the same unresolved production issues. Need deduplication: before creating a UC, check if one with the same `id` pattern exists.

2. **PM zombie tasks**: PM tasks are being spawned but not completing (65-68h stale). Suspected cause: PM agent timeout or zombie_timeout failure pattern (noted in FAILURE_PATTERNS). Need heartbeat-level cleanup: auto-cancel any task in_progress > 4h with no heartbeat update.

3. **P0 UCs with zero tasks**: 6 P0 UCs have never had a task spawned against them. The orchestrator heartbeat spawn logic may be blocked on P1 tasks that are also not_started — circular blocking.

4. **Feature deployment gap**: Dev agents are completing PRs and resolving merge conflicts, but the deployment step (Vercel env vars + deploy verification) is not part of any UC's workflow. Features ship code but don't ship to production.

### 3. Top Blocker

**Stripe and email env vars are not configured in Vercel production.** This is the single highest-leverage fix. Until STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_* IDs, and RESEND_API_KEY are set in Vercel:
- No agent can subscribe
- No trial-to-paid conversion is possible
- No automated emails are sent
- All billing endpoints return 503

This must be done by Stojan (requires Vercel dashboard access + real Stripe credentials). No agent can fix this autonomously.

### 4. Recommendation

**Focus today:** Stojan must manually set Stripe + email env vars in Vercel production. Every other dev task is blocked behind this wall. Additionally, the UC deduplication issue in the smoke handler needs a dev fix to stop inflating the backlog.

---

## Action Items Required from Stojan

1. **Set Vercel env vars** (Blocker — nothing ships without this):
   - `STRIPE_SECRET_KEY` — production Stripe secret key
   - `STRIPE_WEBHOOK_SECRET` — from Stripe dashboard → webhooks
   - `STRIPE_PRICE_STARTER_MONTHLY`, `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_TEAM_MONTHLY`, `STRIPE_PRICE_BROKERAGE_MONTHLY` — real Stripe price IDs
   - `RESEND_API_KEY` — for email delivery
   
2. **Go-ahead for pilot recruitment** — P0 UC `feat-pilot-agent-recruitment-campaign` is not_started. Should the system start outreach to first 3 real estate agents?

---

## Strategic Decisions JSON

```json
{
  "priority_changes": [
    {
      "uc_id": "fix-feature-not-deployed-all-new-routes-return-404-on-",
      "from": 1,
      "to": 0,
      "reason": "All dev work producing 404s in Vercel means every completed feature is invisible. This blocks real-world validation of all shipped code."
    }
  ],
  "cancellations": [
    {
      "task_id": "b4ea78ab-caf0-484e-b0e4-71744847ee77",
      "reason": "Zombie: PM task in_progress for 68h with no progress. Zombie timeout failure pattern."
    },
    {
      "task_id": "11306031-fef7-4b40-9c4f-1f68207a80c3",
      "reason": "Zombie: PM task in_progress for 66h with no progress."
    },
    {
      "task_id": "9a4e4562-b5da-43c8-a77f-02c94551673d",
      "reason": "Zombie: PM task in_progress for 65h with no progress."
    },
    {
      "task_id": "c5aa3e7a-898b-489c-92ee-ad82f2669234",
      "reason": "Zombie: Proactive revenue gap analysis in_progress for 16h — likely timed out."
    }
  ],
  "top_blocker": "Stripe and email env vars not configured in Vercel production — billing returns 503, email is non-functional, zero revenue possible until Stojan sets STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_* IDs, and RESEND_API_KEY in Vercel dashboard.",
  "process_issues": [
    "Smoke handler creating duplicate UCs for the same unresolved production issues (10+ Stripe env var UCs exist). Need deduplication check before UC insert.",
    "PM agent zombie timeout: tasks stuck in_progress for 65-68h. Needs auto-cancel after 4h with no update.",
    "6 P0 UCs have zero tasks ever spawned — pilot recruitment, guided FUB activation, trial conversion. Orchestrator spawn logic may be stuck on P1 prerequisite.",
    "Feature deployment is not in any UC workflow — dev PRs merge but Vercel deploy + verification is skipped."
  ],
  "focus_today": "Stojan must set Stripe + email Vercel env vars immediately; then spawn dev task to deduplicate smoke handler UC creation to stop backlog inflation."
}
```
