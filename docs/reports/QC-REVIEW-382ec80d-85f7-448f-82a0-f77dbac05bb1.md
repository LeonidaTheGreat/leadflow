# QC Review — Task 382ec80d-85f7-448f-82a0-f77dbac05bb1

**Date:** 2026-04-04  
**Branch:** dev/e16e3748-dev-fix-sms-messages-message-body-column  
**Verdict:** APPROVED (fix pre-existing on main; QC corrected faulty integration test)

---

## Bug Description

`sms_messages.message_body` column — opt-out detection in `sms-stats/route.ts` was broken.

**Actual root causes (both now fixed on main):**
1. Route was selecting wrong column (`body` in original, should be `message_body`) — fixed in `6e4ec54`
2. Route used `sms_messages.agent_id` directly but that column doesn't exist; fix uses `leads!inner(agent_id)` join — fixed in `5cf2edf`

---

## Automated Gates

| Check | Result |
|-------|--------|
| `npm run build` | PASS |
| Integration test (sms-optout-column) | 8/8 PASS |
| No junk files | PASS |
| No unauthorized root .md files | PASS |

---

## Fix Verification

**The bug fix was already applied to main prior to this QC pass.**

- `message_body` column confirmed in DB ✅
- No `body` column in `sms_messages` ✅  
- No `agent_id` column in `sms_messages` (joins through `leads` required) ✅
- `sms-stats/route.ts` on main uses `leads!inner(agent_id)` join + `message_body` ✅
- Opt-out filter correctly references `m.message_body` ✅

The dev agent's commit (`b2ab797`) only changed `.orchestrator-heartbeat` — no code changes. This matches the `no_commits_on_branch` failure pattern. However, the fix was already present on main from earlier commits.

---

## Integration Test Correction

The previous QC pass (`cb2a3c0`) added `tests/integration/sms-optout-column.test.js` with **incorrect assertions**:
- Said "does NOT use leads!inner join" — but leads!inner IS the correct approach
- Said "uses direct .eq(agent_id) filter" — but that column doesn't exist in `sms_messages`

**This QC pass corrected the test** (commit `8d6c7bf`) to verify the actual correct implementation:
- Asserts `leads!inner(agent_id)` join IS used for inbound agent scoping
- Asserts direct `.eq('agent_id', agentId)` is NOT used on `sms_messages`
- Asserts `message_body` column is selected (not `body`)
- Verifies DB schema matches: `message_body` exists, `body` does not, `agent_id` does not

Test results: **8/8 passed** on both the branch and main.

---

## QC Checklist

### Security
- [x] No tokens/secrets involved
- [x] Auth via `getAuthUserId` (reads from session, not query params)
- [x] No auth bypass paths
- [x] No dead code

### Code Quality
- [x] Error handling present
- [x] No hardcoded secrets or URLs
- [x] Strict equality used throughout

### Path & Structure
- [x] Integration test in `tests/integration/` ✅
- [x] QC report in `docs/reports/` ✅
- [x] No .md files at repo root ✅

### Semantic Correctness
- [x] `message_body` is the correct DB column name (confirmed via `\d sms_messages`)
- [x] `leads!inner(agent_id)` is the correct agent scoping pattern
- [x] `sms_messages` has no direct `agent_id` column (confirmed via schema query)
