# Genome Core Module Tests

These tests verify the core orchestration modules from `~/.openclaw/genome/`.

## Test Files

- `local-pg.test.js` - Tests for LocalPgClient / QueryBuilder (select, insert, not, contains)
- `workflow-engine.test.js` - Tests for workflow-engine (selectInitialModel, classifyAreas)
- `parseUTC.test.js` - Tests for parseUTC timestamp parsing utility
- `heartbeat-step-health.test.js` - Regression tests for step health timeout fixes (task 94ae0f36): verifies wrapper timeout ≥90 min, dispatcher uses spawn+detach, executor writes start timestamp, health-loop guards non-leadflow projects

## Running Tests

These tests must be run from the genome directory:

```bash
cd ~/.openclaw/genome
npm test
```

## Test Coverage

- **local-pg.test.js**: SELECT, INSERT, UPDATE operations; filter operators (.not, .is, .contains, .in)
- **workflow-engine.test.js**: Model selection, area classification, cost estimation, area contention, model escalation
- **parseUTC.test.js**: UTC timestamp parsing with various formats
- **heartbeat-step-health.test.js**: Step health configuration guards (wrapper timeout, watchdog spawn, start timestamp, project guard, Heartbeat maxHours)

## Total Tests

103 tests across 7 test suites (including extended tests in genome repo)
