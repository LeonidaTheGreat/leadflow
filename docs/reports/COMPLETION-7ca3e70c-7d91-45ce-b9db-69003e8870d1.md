# Completion Report — 7ca3e70c-7d91-45ce-b9db-69003e8870d1

**Task:** Improve: dev agent instructions — Add GIT NETWORK RESILIENCE rule  
**Status:** completed  
**Date:** 2026-07-25

## Changes Made

### 1. `/Users/clawdbot/projects/genome/core/food/role-context.js`
Added `GIT NETWORK RESILIENCE (mandatory)` rule in the dev role's "Commit and push" section (after PHANTOM COMPLETION PROHIBITION). Rule prescribes:
1. Wait 30s on timeout
2. Switch SSH → HTTPS (`git remote set-url origin https://github.com/LeonidaTheGreat/leadflow.git`)
3. Retry the operation
4. After 2 retries still failing: report `branch-creation-failed` with exact error

Committed to genome main: `f9b459b7`

### 2. `/Users/clawdbot/.openclaw/workspace-dev/SOUL.md`
Rule added under "Your North Star" section (from previous attempt on this branch).

### 3. `/Users/clawdbot/.openclaw/workspace-dev/RULES.md`
Rule added under new "Git Network Resilience" section (from previous attempt on this branch).

## Root Cause Analysis

**failurePoint:** Three investigation tasks (bd7db0a3, 97d3267e, e28c83f4) died as zombies after 5-6 min with git remote timeout errors before any branch was created.

**why:** No retry logic existed for transient git network failures. Agents treated first timeout as fatal and exited without completing the task.

**fix:** Added HTTPS-fallback retry protocol to all three dev agent context sources (SOUL.md, RULES.md, role-context.js) so agents retry with HTTPS before giving up.

## Verification

```
grep -n "GIT NETWORK RESILIENCE" ~/projects/genome/core/food/role-context.js
# → line 448: GIT NETWORK RESILIENCE (mandatory): If any git remote operation...
```
