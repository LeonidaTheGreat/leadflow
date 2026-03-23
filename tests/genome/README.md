# Genome Core Module Tests

These tests verify the core orchestration modules from `~/.openclaw/genome/`.

## Test Files

- `local-pg.test.js` - Tests for LocalPgClient / QueryBuilder (select, insert, not, contains)
- `workflow-engine.test.js` - Tests for workflow-engine (selectInitialModel, classifyAreas)
- `parseUTC.test.js` - Tests for parseUTC timestamp parsing utility

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

## Total Tests

98 tests across 6 test suites (including extended tests in genome repo)
