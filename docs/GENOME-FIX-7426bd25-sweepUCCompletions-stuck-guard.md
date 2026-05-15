# Genome Fix: sweepUCCompletions stuck UC guard + dotenvx normalization

**Task ID:** 7426bd25-0a48-4711-80c2-f46099dee641  
**Date:** 2026-05-14

## Root Cause

Two bugs in `sweepUCCompletions` (`~/.openclaw/genome/core/loops/execution-loop.js`):

**Bug 1 — stuck UC task loop:**  
When a UC has `implementation_status = 'stuck'`, the sweep still created `Dev: UC acceptance failed — <uc-id>` tasks. `UCLifecycle.checkUCExhausted` immediately cancelled them, but the next heartbeat recreated them. 3 tasks created in 2h for uc-revenue-aha-moment.

**Bug 2 — dotenvx bypass of 24h cooldown:**  
The `hasChanged` cooldown compared raw `execSync` output. dotenvx/dotenv banner lines include rotating tip text that changes every run, so the stored state always differed — every heartbeat appeared as a "new" change, bypassing the 24h dedup guard.

## Fix

**File:** `~/.openclaw/genome/core/loops/execution-loop.js`  
**Genome branch:** `dev/7426bd25-genome-fix-sweepuccompletions-must-not-c`

1. Added stuck-UC guard after the `hasChanged` check — skips acceptance fix task creation when `uc.implementation_status === 'stuck'`.
2. Strip dotenvx banner lines from acceptance check output before `hasChanged`, so only real check output is compared.

## Verification

```bash
grep 'acceptance failing but UC is stuck' ~/.openclaw/genome/core/loops/execution-loop.js
# → found

grep 'normalizedResults' ~/.openclaw/genome/core/loops/execution-loop.js
# → found (2 lines)
```

No new `Dev: UC acceptance failed — uc-revenue-aha-moment` tasks in next 3 heartbeats.
