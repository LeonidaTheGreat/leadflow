# PRD-PM-ACTION-ITEMS-DASHBOARD — Review Findings

Review ID: d411d67d-1d6f-4d04-a15b-178ba98e0cc6
Task ID: 5d29b5ee-bb3e-4e75-a5a7-b8679c371b84
Date: 2026-07-24
Verdict: pass_with_issues (score 70)

## What Was Reviewed

Implementation of PM structured action items as specified in PRD-PM-ACTION-ITEMS-DASHBOARD.

## Acceptance Criteria Results

| AC | Status | Notes |
|----|--------|-------|
| AC-1: SOUL.md Updated | partial | No PM SOUL.md exists; IDENTITY.md has no action items instructions |
| AC-2: HEARTBEAT.md Updated | pass_with_issues | Instructions present but code uses deprecated Supabase client (removed 2026-03-18) |
| AC-3: Action Items on Dashboard | pass | Orchestration dashboard port 8787 has full section; 443 items in DB |
| AC-4: Orchestrator Reads Action Items | pass | action-item-loop.js + product-review-processing.js wired correctly |
| AC-5: Action Item Lifecycle | pass | WAITING→RESOLVED lifecycle working in dashboard and orchestrator |

## Findings

### [HIGH] HEARTBEAT.md uses deprecated Supabase client

`/Users/clawdbot/.openclaw/workspace-product-manager/HEARTBEAT.md` lines 43–62 show PM agents inserting action items via `createClient(@supabase/supabase-js)` using `SUPABASE_URL`. Supabase was removed 2026-03-18. Running this code fails silently.

**Correct architecture (already working):** PM writes `action_items` array to `product_reviews` completion report JSON → orchestrator's `_processCompletedReviews()` reads it and inserts to DB.

**Fix:** Update HEARTBEAT.md to document the completion report JSON pattern. Remove the Supabase code block.

### [HIGH] UX screenshot capture cannot authenticate

All authenticated pages (`/dashboard`, `/dashboard/pricing`, `/settings`, `/admin/simulator`) render as login redirect in captured screenshots. Only landing page and login are visible. Genome cannot detect UX regressions in any post-login customer experience.

**Fix:** Add a pre-capture login step to `visual-ux-capture.js` using a fixed test account. Navigate to `/login`, submit credentials, then proceed to protected routes.

### [MEDIUM] Brokerage plan missing from signup Step 1

Landing page advertises 4 tiers (Starter $49, Pro $149, Team $399, Brokerage $999+). Signup plan selector shows only 3 cards. Enterprise prospects have no conversion path from the signup flow.

**Fix:** Add Brokerage card with Contact Sales CTA to signup Step 1.

### [MEDIUM] Lead limit inconsistency between landing and signup

Landing page Starter: 100 SMS/month. Signup Step 1 Starter: Up to 50 leads/month. Different metrics, different numbers. Pro: landing says unlimited SMS, signup says 200 leads/month.

**Fix:** Standardize on leads/month. Update landing page pricing section to match signup flow numbers (50 / 200 / 500).

## What Is Working

- Action items section in orchestration dashboard: full render with priority, options, response workflow
- 443 action items in DB, all resolved — lifecycle WAITING→RESOLVED functioning
- product-review-processing.js correctly extracts PM action_items from review JSON
- Landing page UX: professional, benefit-first, passes 5-second clarity test
- Lead simulator at /admin/simulator: clean, accessible without auth, demo link generation present

## Action Items Created

4 action items inserted into `action_items` table (source_type: pm_recommendation):
1. P1: Fix UX screenshot capture authentication
2. P2: Fix PM HEARTBEAT.md stale Supabase code
3. P2: Add Brokerage plan to signup Step 1
4. P2: Align lead limits between landing page and signup flow
