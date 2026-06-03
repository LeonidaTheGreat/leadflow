# QC Review: fix-sms-messages-agent-id-column-does-not-exist-query

**Task ID:** 15444a07-45a0-49ba-8cae-8a2c0c9b1b9e
**Branch:** dev/42327d6d-dev-fix-sms-messages-agent-id-column-doe
**Reviewer:** QC Agent
**Date:** 2026-04-04
**Verdict:** REJECT

## Summary

The dev correctly fixed the primary bug (removing `.eq('agent_id', agentId)` from sms_messages and adding a `leads!inner(agent_id)` join). However, the fix **introduced a new bug** by changing the column name from `message_body` to `body`.

## Automated Gates

| Gate | Result |
|------|--------|
| Build | PASS |
| Tests (npm test) | Pre-existing failures (23 suites, unrelated to this change) |
| Junk files | PASS |
| Root .md files | N/A (LEARNINGS.md, SCHEMA.md are from main divergence, not this branch) |

## Critical Finding: Wrong Column Name

**Actual sms_messages schema (verified via `\d sms_messages`):**
```
id, lead_id, direction, message_body, twilio_sid, status, created_at
```

The dev changed:
- `.select('lead_id, message_body')` → `.select('lead_id, body, leads!inner(agent_id)')` ❌
- `m.message_body` → `m.body` ❌

The column is `message_body`, NOT `body`. The task description contained an incorrect schema ("body") which the dev trusted without verifying against the actual database.

**Impact:** The inbound query will fail at runtime because `body` column does not exist on `sms_messages`. This replaces one broken query with a different broken query.

## What Was Correct

1. ✅ Removed `.eq('agent_id', agentId)` from sms_messages (agent_id column doesn't exist)
2. ✅ Added `leads!inner(agent_id)` join for agent scoping
3. ✅ Used `.eq('leads.agent_id', agentId)` for filtering
4. ✅ Applied the join pattern to both outbound and inbound queries

## What Needs Fixing

1. **Inbound select:** Change `body` back to `message_body` in the select clause
2. **Outbound select:** Verify if outbound query needs `message_body` (currently doesn't select it — OK)
3. **Opt-out filter:** Change `m.body` back to `m.message_body`
4. **Comments:** Update "Schema uses 'body'" comments to reflect actual column name `message_body`
5. **Tests:** The test file checks for `m.body` — should check for `m.message_body`

## Checklist Summary

- [x] Security: auth via getAuthUserId, no bypasses
- [x] No loose equality
- [x] Error handling present
- [x] No hardcoded secrets
- [x] Import paths correct
- [x] Files in correct directories
- [x] No junk files committed
- [ ] **BLOCKING: Table/column references are correct** — `body` column does not exist, must be `message_body`
- [x] No root-level .md files from this branch
