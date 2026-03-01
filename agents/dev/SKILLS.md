---
title: SKILLS.md - LeadFlow Dev Agent
author: Stojan
date: 2026-02-23
tags: [dev, skills, full-stack]
project: leadflow-ai
---

# LeadFlow Dev Agent - SKILLS.md

## Core Skills

### 1. implement_feature
**Purpose:** Build a feature to spec, fully tested
**Input:** Feature requirements, acceptance criteria
**Output:** Working code, tests passing, documentation
**Process:**
1. Read requirements
2. Design approach (note in NOTES/)
3. Implement code
4. Write tests
5. Run self-test checklist
6. Document in NOTES/
**Acceptance Criteria:**
- [ ] Feature works as specified
- [ ] Unit tests pass
- [ ] Integration tests pass (if applicable)
- [ ] Self-test checklist complete
- [ ] No TypeScript errors
- [ ] Documentation updated

### 2. fix_bug
**Purpose:** Reproduce, diagnose, fix, verify
**Input:** Bug report
**Output:** Fixed code, test case, documentation
**Process:**
1. Reproduce bug
2. Add failing test
3. Fix code
4. Verify test passes
5. Check for regressions
6. Document root cause
**Acceptance:**
- [ ] Bug reproduced
- [ ] Test added (catches the bug)
- [ ] Fix implemented
- [ ] Test passes
- [ ] No regressions

### 3. integrate_api
**Purpose:** Connect to external API (FUB, Twilio, etc.)
**Input:** API docs, credentials, requirements
**Output:** Working integration, error handling
**Checklist:**
- [ ] Auth working (Basic, Bearer, etc.)
- [ ] Endpoint responds
- [ ] Error handling (404, 500, timeout)
- [ ] Rate limiting respected
- [ ] Tested with real data
**Acceptance:**
- [ ] All checklist items pass
- [ ] Integration documented
- [ ] Credentials not logged/exposed

### 4. build_webhook_handler
**Purpose:** Create endpoint to receive webhooks
**Input:** Webhook spec, signature verification method
**Output:** Handler function, tests
**Requirements:**
- Signature verification
- Fast response (<2s)
- Async processing
- Error logging
**Acceptance:**
- [ ] Signature verified
- [ ] Returns 200 quickly
- [ ] Processes payload correctly
- [ ] Error cases handled

### 5. optimize_performance
**Purpose:** Improve speed or resource usage
**Input:** Performance metrics, bottlenecks
**Output:** Optimized code, before/after metrics
**Acceptance:**
- [ ] Before metrics documented
- [ ] Optimization implemented
- [ ] After metrics documented
- [ ] Improvement verified
- [ ] No regressions

### 6. write_tests
**Purpose:** Ensure code quality with tests
**Input:** Code to test
**Output:** Test suite
**Types:**
- Unit tests (functions, utilities)
- Integration tests (APIs, webhooks)
- E2E tests (full flows)
**Acceptance:**
- [ ] Tests cover happy path
- [ ] Tests cover error cases
- [ ] Tests pass
- [ ] Coverage >80% for critical paths

### 7. document_decision
**Purpose:** Record architectural decisions
**Input:** Decision made, alternatives considered
**Output:** ADR in docs/decisions/
**Template:**
```markdown
# ADR-XXX: Title

**Date:** YYYY-MM-DD
**Status:** Proposed | Accepted | Deprecated
**Decision:** What we decided
**Context:** Why we had to decide
**Alternatives:** What else we considered
**Consequences:** What this enables/blocks
```
**Acceptance:**
- [ ] Decision clear
- [ ] Context explained
- [ ] Alternatives listed
- [ ] Consequences noted

### 8. deploy_to_vercel
**Purpose:** Deploy code to production
**Input:** Code changes, environment variables
**Output:** Live deployment
**Steps:**
1. Commit changes
2. Push to GitHub
3. Vercel auto-deploys
4. Verify deployment
5. Run smoke tests
**Acceptance:**
- [ ] Deployment successful
- [ ] Smoke tests pass
- [ ] Environment variables correct
- [ ] No console errors

### 9. run_database_migration
**Purpose:** Update Supabase schema
**Input:** Migration SQL
**Output:** Applied migration
**Steps:**
1. Write migration in supabase/migrations/
2. Test locally
3. Apply to staging
4. Verify
5. Apply to production
**Acceptance:**
- [ ] Migration runs successfully
- [ ] No data loss
- [ ] RLS policies updated if needed
- [ ] Application works with new schema

### 10. debug_integration
**Purpose:** Troubleshoot failing integration
**Input:** Error logs, symptoms
**Output:** Root cause, fix
**Process:**
1. Check logs
2. Verify credentials
3. Test endpoint manually
4. Check rate limits
5. Inspect request/response
6. Implement fix
**Acceptance:**
- [ ] Root cause identified
- [ ] Fix implemented
- [ ] Integration working
- [ ] Prevention noted

---

### 11. complete_task_and_push
**Purpose:** Finalize work and make it available for QC review
**When to use:** After all acceptance criteria are met and tests pass
**Process:**
1. Run `npm test` — all tests must pass
2. Stage changes: `git add <files>` (review what you stage — never `git add .` blindly)
3. Commit: `git commit -m "feat: <description>"`
4. Push: `git push -u origin <branch-name>`
5. Write completion report via `subagent-completion-report.js`
**Rules:**
- [ ] Do NOT create PRs — orchestrator handles this
- [ ] Do NOT merge or checkout other branches
- [ ] Do NOT force push
- [ ] If push fails due to upstream changes: `git pull --rebase origin <branch>` then push again

---

## Tool Access

| Tool | Purpose |
|------|---------|
| Git | Version control |
| GitHub | Code hosting, PRs |
| Vercel | Deployment |
| Supabase | Database, auth |
| FUB API | CRM integration |
| Twilio API | SMS |
| Anthropic API | AI |

## Deliverables

**Per Task:**
- Code changes
- Test coverage
- NOTES/ entry
- Self-test checklist

**Per Sprint:**
- Feature complete
- Tests passing
- Documentation updated
- Deployed to production

---

*Skills execute. Code ships. Leads flow.*
