# PRD: Daily Strategic Review — 2026-03-24

**Type:** Orchestrator Strategic Review (PM Output)  
**Date:** 2026-03-24  
**Task ID:** 6ba60897-6ee1-4f97-9ea8-d02442dfd732  
**Day:** ~12 of 60  
**Revenue Target:** $20K MRR by Day 60  

---

## Executive Summary

At Day 12, the product is in a **re-merge pipeline crunch**. 179 UCs complete, but 19 dev re-merge tasks are queued at P3 while critical P1 UCs (auth smoke loop, landing page deployment, genome observability) remain incomplete or not-started. The top risk is **auth potentially broken** (smoke loop detected, UC not-started at P1) which blocks every user from signing up.

---

## Current System State

### Task Queue
| Status | Count |
|--------|-------|
| Done | 1,622 |
| Ready | 19 |
| In Progress | 1 (this review) |
| Failed | 9 |
| Cancelled | 145 |
| Stuck | 0 |

### UC Completion
| Status | Count |
|--------|-------|
| Complete | 179 |
| Needs Merge | ~5 |
| In Progress | ~7 |
| Not Started | 2 critical |
| Stuck | 1 |

---

## P1 UCs Not Yet Complete

| ID | Name | Status | Urgency |
|----|------|--------|---------|
| fix-smoke-auth-signup-login-loop | Fix Smoke Test Loop — Auth signup then login | **not_started** | 🔴 CRITICAL |
| uc-smoke-loop-dedup | Smoke Test Loop Deduplication | **not_started** | 🔴 HIGH |
| fix-marketing-landing-page-not-deployed-to-production | Landing page not deployed | **needs_merge** | 🔴 HIGH |
| feat-frictionless-onboarding-flow | Self-Serve Frictionless Onboarding | **needs_merge** | 🟡 HIGH |
| fix-start-free-trial-cta-feature-not-integrated | Start Free Trial CTA | **needs_merge** | 🟡 HIGH |
| fix-triage-the-get-free-playbook-section | Get Free Playbook section stuck | **stuck** | 🟡 MEDIUM |
| genome-phase1a-observability | Genome Observability | **in_progress** | 🟡 MEDIUM |
| genome-phase1b-error-propagation | Genome Error Propagation | **in_progress** | 🟡 MEDIUM |
| feat-supabase-to-postgrest-migration | Supabase→PostgREST migration | **in_progress** | 🟡 MEDIUM |

---

## Failure Pattern Analysis

9 tasks failed. 7 of 9 share the same root cause: **"branch does not exist"** — dev agents are creating branches that disappear before verification.

**Root cause hypothesis:** Dev agents are creating branches on a remote that gets GC'd or they're using incorrect branch naming. This is a systemic git hygiene issue, not individual task failures.

**Affected failed tasks:**
- fix-primary-signup-api-utm-capture (branch does not exist)
- improve-landing-page-analytics-ga4 (branch does not exist)  
- fix-onboarding-page-utm-params (branch does not exist)
- UC-DEPLOY-LANDING-001 (branch does not exist)
- Fix: Dashboard build errors (branch does not exist)
- feat-sms-analytics-dashboard (branch does not exist)
- Dev: improve-UC-5 (branch does not exist)

---

## Strategic Decisions

### 1. Priority Adjustments

**None required** — priority assignments look correct. The `fix-smoke-auth-signup-login-loop` and `uc-smoke-loop-dedup` are already P1. The concern is they have no tasks spawned yet.

### 2. Cancellations Recommended

| Task ID | Reason |
|---------|--------|
| db5227bb (PM: Loop detected — Smoke: Auth signup then login) | Superseded by UC `fix-smoke-auth-signup-login-loop` (P1 not_started). PM loop-detection task is redundant — dev should fix the actual issue. |
| 6f8efb17 (PM: Loop detected — Smoke: Vercel dashboard health) | Superseded by UC `uc-smoke-loop-dedup` (P1 not_started). Same pattern. |
| 0db5ffd2 (fix-pilot-pricing-decision-implemented-as-uc-spec) | Meta/process task describing a UC spec gap. The actual UCs exist and have tasks. No dev work needed from this task. |

### 3. Top Blocker

**Auth smoke loop not fixed.** UC `fix-smoke-auth-signup-login-loop` is P1 not_started with zero tasks in the queue. If signup/login is actually broken in production, every new user attempting the product is hitting a wall. This must be addressed before any marketing effort.

### 4. Process Issues

1. **"Branch does not exist" epidemic** — 7 failed tasks with identical error. Dev agents are not pushing branches before filing PRs, or using wrong remote. Need a pre-verification step that checks `git push origin <branch>` success before marking task complete.

2. **Re-merge queue depth** — 19 P3 re-merge tasks all exist simultaneously. This is a healthy sign (work is done), but it creates merge conflict risk as each re-merge touches overlapping files. Should process sequentially, not in parallel.

3. **Stale product decisions** — 4 `product_decisions` proposals have been unresolved since March 11-24:
   - Twilio provisioning model (blocking!)
   - Merge dev→main (blocking!)
   - Stripe test vs live mode
   - Landing CTA: Trial-first vs Pilot-first
   These need Stojan's decision or the system needs to auto-close them per recommended option.

4. **Loop detection noise** — Smoke test loop detection is generating P4 PM tasks instead of P1 dev tasks. This is misrouted work. Smoke failures should spawn dev tasks, not PM tasks.

### 5. Today's Focus

**Ship the landing page + fix auth** — the two P1 not_started UCs need tasks spawned immediately. Everything else (19 P3 re-merges, genome work) is secondary to ensuring users can reach and use the product.

---

## Acceptance Criteria (for this review)

- [ ] Strategic decisions documented in completion report JSON
- [ ] Redundant loop-detection tasks cancelled
- [ ] Blocking product decisions surfaced to Stojan via action_items
- [ ] Recommendation communicated clearly

---

## Stale Product Decisions → Action Items

All 4 open `product_decisions` entries should surface as DECISION action_items on the dashboard so Stojan can resolve them in one session.
