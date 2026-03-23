# Completion Report: Create automated tests for genome core modules

**Task ID:** 8d2a8251-affa-434a-aee0-72c8a32304fa  
**Use Case:** genome-phase1c-testing  
**Status:** ✅ COMPLETE  
**Date:** 2026-03-23

## Summary

Automated tests for Genome core modules have been successfully created and are passing. The tests are located in `~/.openclaw/genome/tests/` (Genome repository).

## Test Files Created

### 1. `tests/local-pg.test.js`
Tests for the LocalPgClient / QueryBuilder in `core/local-pg.js`:
- **select()**: Returns rows from SELECT queries with proper column quoting
- **insert()**: Returns inserted row when `.select().single()` is chained
- **update()**: Modifies rows and returns updated data
- **Filter operators**:
  - `.not(col, is, null)` generates IS NOT NULL
  - `.is(col, null)` generates IS NULL
  - `.contains(col, array)` generates @> operator
  - `.in(col, array)` generates IN clause

Uses mocked `pg.Pool` - no live database required.

### 2. `tests/workflow-engine.test.js`
Tests for pure functions in `core/workflow-engine.js`:
- **selectInitialModel()**: Model selection based on agent type and task complexity
  - Returns sonnet for product agent (low complexity)
  - Returns qwen3-coder for dev agent with low complexity
  - Returns sonnet for dev agent when task contains "api" keyword
  - Handles missing UC gracefully
  - Prioritizes high-complexity keywords
- **classifyAreas()**: Tags tasks with areas (auth, billing, sms, etc.)
  - Tags auth tasks correctly
  - Tags billing/stripe tasks
  - Tags sms/twilio tasks
  - Handles null/empty input gracefully
- **estimateCost()**: Cost estimation for models
  - Returns 0 for local models (qwen3-coder, qwen3.5)
  - Returns positive number for cloud models (sonnet, kimi)
- **checkAreaContention()**: Detects area contention with in-flight tasks
- **escalateModel()**: Model escalation following the ladder
- **modelLadderIndex()**: Returns index for known models
- **normalizeAgentId()**: Normalizes agent labels to IDs

### 3. `tests/parseUTC.test.js`
Tests for `parseUTC()` function from `core/heartbeat-executor.js`:
- Handles Date objects - returns them as-is
- Handles strings without Z suffix - appends Z
- Handles strings with Z suffix - parses correctly
- Handles strings with timezone offset (+HH:MM)
- Handles null - returns epoch (new Date(0))
- Handles undefined - returns epoch
- Handles empty string - returns epoch
- Handles PostgreSQL timestamp without timezone (YYYY-MM-DD HH:MM:SS)

## Test Infrastructure

- **Test Framework:** Jest v30.3.0
- **Test Command:** `npm test` (runs `jest --testPathPatterns=tests/`)
- **Mocking:** pg.Pool is fully mocked for local-pg tests
- **No External Dependencies:** All tests run without live database or external services

## Test Results

```
Test Suites: 6 passed, 6 total
Tests:       92 passed, 92 total
Snapshots:   0 total
Time:        ~0.3s
```

All tests pass successfully.

## Git Commit

The test files were committed to the Genome repository:
- **Commit:** `4923d72` - "feat: add automated tests for genome core (phase 1C)"
- **Files:**
  - `tests/local-pg.test.js` (164 lines)
  - `tests/parseUTC.test.js` (89 lines)
  - `tests/workflow-engine.test.js` (112 lines)
  - `package.json` (jest dev dependency + test script)
  - `package-lock.json` (dependency updates)

## Notes

The Genome repository (`~/.openclaw/genome/`) is a separate repository from LeadFlow. The orchestration engine code lives there, and the tests were added to that repository. This completion report is filed in the LeadFlow repository to track the task completion status.

## Verification

To verify the tests:
```bash
cd ~/.openclaw/genome
npm test
```
