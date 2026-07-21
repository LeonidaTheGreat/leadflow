# Genome Fix: PR Creation Exhaustion Telegram Alert

**Task:** 0d86f6fc-5972-481e-a52d-5e293713f8b9
**Genome commit:** 28a855ff (genome/main)

## Root Cause

`CompletionScanner.run()` in `genome/core/sensors/completion-scan.js` called
`failTask()` when PR creation exhausted all 8 attempts, but never called
`this.sendTelegram()`. The `sendTelegram` method existed on the class and was
wired to the dispatcher's Telegram sender but was never invoked on exhaustion.

## Fix Applied (genome repo)

Added a guarded `this.sendTelegram()` call immediately before `failTask()` in
the PR exhaustion branch. Alert includes: task_id, task title, branch_name,
error text, and attempt count. Wrapped in try-catch because `sendTelegram` may
return `undefined` in some contexts (e.g. tests), and chaining `.catch()` on
`undefined` would throw and prevent `failTask` from running.

**Files changed in genome:**
- `core/sensors/completion-scan.js`
- `tests/completion-scan-pr-creation-retry.test.js`

## Test Results

9/9 tests pass in `tests/completion-scan-pr-creation-retry.test.js`.
