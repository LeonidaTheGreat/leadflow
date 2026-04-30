# PM Analysis: NPS Score Metric Gap
**Date:** 2026-04-29  
**Task:** 99dc1e17-94c4-41a9-b2a6-76c796fed22b  
**Status:** Root cause found, bug UC created

---

## Finding: NPS = null is correct — surveys have never been sent

`agent_nps_responses` has 0 rows. The `nps_collector` accurately returns null. The infrastructure is complete but the delivery pipeline is broken.

---

## Two bugs blocking all NPS data collection

### Bug 1 (P0): CRON_SECRET not configured in Vercel

All 9 Vercel cron routes gate on `CRON_SECRET`. The env var is absent from the Vercel dashboard project. Every scheduled cron (`/api/cron/nps-surveys`, `/api/cron/follow-up`, `/api/cron/send-trial-emails`, etc.) has been returning 503 silently since deployment.

**Impact:** Not just NPS — ALL scheduled automations are dead (follow-up emails, inactivity alerts, trial emails, pilot checks).

**Fix:** `vercel env add CRON_SECRET production` with a strong random value.

### Bug 2 (P1): Status filter excludes every agent

`getAgentsDueForSurvey()` in `lib/nps-service.ts:176` filters `.eq('real_estate_agents.status', 'active')`. All 23 agents in `real_estate_agents` have status `onboarding`. Zero agents are ever returned as due for survey.

**Fix:** Change filter to include `onboarding` and `pilot` statuses.

---

## Current state

| Metric | Value |
|--------|-------|
| Agents in survey schedule | 23 |
| Overdue surveys | 1 (madjunkov@hotmail.com, due 2026-04-26) |
| NPS responses | 0 |
| NPS tokens issued | 0 |
| Surveys ever sent | 0 |

---

## Actions taken

1. **Created UC** `fix-nps-cron-pipeline-broken-cron-secret-missing-and-status-filter` (P1, dev+qc workflow) to fix both bugs.

2. **Noted**: UC `c740b281` (NPS Metric Auto-Collection via nps_collector) is `not_started` but the genome collector code is already implemented. Genome team should verify the collector runs and mark this UC complete.

---

## Path to NPS = 50

NPS is a lagging indicator. The path is: fix pipeline → send surveys → collect responses → compute score.

With 0 paying customers and all agents in `onboarding` status, even a fixed pipeline will yield data only from test/pilot accounts. The primary lever remains MRR (converting trial → paid), not NPS directly. NPS of 50 will follow naturally from satisfied paying customers.

**Priority order:** MRR → Trial Activation Rate → NPS Score
