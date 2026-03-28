# PRD: Daily Strategic Review — 2026-03-28

**Type:** Orchestrator Strategic Review  
**Date:** 2026-03-28  
**Task ID:** 0100770a-4925-4648-a0c4-d2208f757032  
**Author:** PM Agent

---

## Executive Summary

All 225 use cases are marked **complete**. No tasks are in flight. The system is **idle and waiting on human decisions** that are now 6–22+ days overdue. LeadFlow is Day ~28 of 60 with **0 paying pilots** — a critical trajectory risk.

---

## Current State Assessment

### Use Case Coverage
| Priority | Status | Count |
|----------|--------|-------|
| P0 | Complete | 17 |
| P1 | Complete | 103 |
| P2 | Complete | 103 |
| P3 | Complete | 2 |
| **Total** | **All complete** | **225** |

### Task Pipeline
- **Active tasks:** 1 (this review)
- **Failed tasks:** 0
- **Pending tasks:** 0
- **Cancelled (recent):** 10 — all failed due to "branch does not exist" verification

### Critical Blockers (Waiting on Stojan)
1. **PR #617 not merged** — 23 API routes broken in production (auth, billing, SMS all return 500 on Vercel)
2. **STRIPE_SECRET_KEY missing from Vercel** — all billing endpoints return 503
3. **Pilot recruitment not approved** — 28+ days elapsed, 0 agents onboarded, 0 MRR
4. **Twilio provisioning model undecided** — blocks pilot agent setup
5. **Landing CTA direction undecided** — trial-first vs pilot-first

---

## Strategic Decisions

### Priority Changes
None — all UCs are complete, no reprioritization needed.

### Cancellations
No active tasks to cancel.

### Top Blocker
**Production auth and billing are broken.** PR #617 fixes 23 routes returning 500 errors. Without this merge + STRIPE_SECRET_KEY in Vercel, zero pilot agents can sign up or pay. The product is functionally inoperable on the live URL.

### Process Issues
1. **Action items backlog:** 12 items pending Stojan's decision, some 22+ days old. The system cannot progress without human sign-off.
2. **Cancelled task pattern:** Multiple tasks cancelled with "branch does not exist" — the git verification step is too aggressive or branches are pruned before QC runs. This means some shipped features (UTM tracking, analytics, landing page deploy) may not have been verified in main.
3. **Revenue trajectory:** Day 28 of 60 with $0 MRR. Need ~$330/day to hit $20K MRR target. Every day of blocked pilot recruitment increases the required conversion rate.

### Recommendation
**Unblock production today:** merge PR #617 and add STRIPE_SECRET_KEY to Vercel. Then immediately begin pilot recruitment outreach. Every other decision is secondary.

---

## Next Phase Requirements

Once production is unblocked and pilots are onboarded, the following capabilities need verification:

### Must Verify in Production (Before Pilot Launch)
1. New agent signup → FUB webhook connection → first SMS response end-to-end
2. Stripe checkout → subscription created → dashboard access unlocked
3. Cal.com booking link included in AI responses
4. A2P 10DLC registration status (SMS compliance for Twilio)

### Phase 2 UCs to Define (Post Pilot Start)
Once 3+ pilots are live, define use cases for:
- Pilot feedback collection and triage
- Agent dashboard KPI views (response rate, booking rate)
- Agent upgrade prompt (Starter → Pro) trigger
- Referral/word-of-mouth mechanism

---

## Acceptance Criteria

This review is complete when:
- [ ] Strategic decisions documented in completion report JSON
- [ ] Action items updated in Supabase dashboard
- [ ] Escalation message sent to Stojan with specific asks

---

*PRD saved to: `docs/prd/PRD-STRATEGIC-REVIEW-2026-03-28.md`*
