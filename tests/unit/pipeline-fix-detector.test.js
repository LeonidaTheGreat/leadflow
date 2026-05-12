'use strict';
/**
 * tests/unit/pipeline-fix-detector.test.js
 *
 * Unit tests for PipelineFixDetector — the sensor that detects 3 recurring
 * pipeline_fix failure patterns in failed tasks.
 *
 * Patterns tested:
 *   1. parked_stuck_chain           — last_error starts with "PARKED: Stuck chain:"
 *   2. exhausted_spawn_time         — last_error starts with "Max retries exhausted at spawn time"
 *   3. parked_verification_no_commits — last_error starts with "PARKED: Verification failed 3x: no commits on branch"
 *
 * Run: node tests/unit/pipeline-fix-detector.test.js
 */

const assert = require('assert');
const { PipelineFixDetector, classifyTask, PIPELINE_FIX_PATTERNS } = require('../../lib/services/PipelineFixDetector');

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeTask(overrides) {
  overrides = overrides || {};
  return {
    id: overrides.id || 'task-001',
    title: overrides.title || 'Fix something',
    agent_id: overrides.agent_id || 'dev',
    status: overrides.status || 'failed',
    last_error: overrides.last_error !== undefined ? overrides.last_error : null,
    retry_count: overrides.retry_count !== undefined ? overrides.retry_count : 3,
    max_retries: overrides.max_retries !== undefined ? overrides.max_retries : 3,
    use_case_id: overrides.use_case_id || null,
    metadata: overrides.metadata !== undefined ? overrides.metadata : null,
    branch_name: overrides.branch_name || null,
    created_at: '2026-05-01T10:00:00Z',
    updated_at: '2026-05-01T12:00:00Z'
  };
}

/**
 * Build a minimal DB mock that returns the given rows from tasks query.
 */
function makeDb(rows) {
  rows = rows || [];
  return {
    query: function() {
      return Promise.resolve({ rows: rows });
    }
  };
}

// ── Test runner ───────────────────────────────────────────────────────────────

var results = { passed: 0, failed: 0 };

function test(name, fn) {
  try {
    fn();
    console.log('  ✅ ' + name);
    results.passed++;
  } catch (err) {
    console.log('  ❌ ' + name);
    console.log('     ' + err.message);
    results.failed++;
  }
}

function testAsync(name, fn) {
  return fn().then(function() {
    console.log('  ✅ ' + name);
    results.passed++;
  }).catch(function(err) {
    console.log('  ❌ ' + name);
    console.log('     ' + err.message);
    results.failed++;
  });
}

// ── Section 1: PIPELINE_FIX_PATTERNS constants ────────────────────────────────

function runSync() {
  console.log('\nSection 1: PIPELINE_FIX_PATTERNS constants');

  test('exports 3 patterns', function() {
    var patternIds = Object.keys(PIPELINE_FIX_PATTERNS);
    assert.strictEqual(patternIds.length, 3, 'expected 3 patterns, got ' + patternIds.length);
    assert.ok(PIPELINE_FIX_PATTERNS.parked_stuck_chain, 'parked_stuck_chain pattern missing');
    assert.ok(PIPELINE_FIX_PATTERNS.exhausted_spawn_time, 'exhausted_spawn_time pattern missing');
    assert.ok(PIPELINE_FIX_PATTERNS.parked_verification_no_commits, 'parked_verification_no_commits pattern missing');
  });

  test('patterns are frozen (immutable)', function() {
    assert.ok(Object.isFrozen(PIPELINE_FIX_PATTERNS), 'PIPELINE_FIX_PATTERNS should be frozen');
  });

  test('each pattern has required fields', function() {
    for (var entry of Object.entries(PIPELINE_FIX_PATTERNS)) {
      var id = entry[0];
      var pattern = entry[1];
      assert.strictEqual(pattern.id, id, 'pattern.id mismatch for ' + id);
      assert.ok(pattern.description, id + ' missing description');
      assert.ok(typeof pattern.test === 'function', id + ' missing test function');
      assert.ok(pattern.severity, id + ' missing severity');
      assert.ok(pattern.recovery, id + ' missing recovery');
    }
  });

  // ── Section 2: classifyTask() — pattern 1: parked_stuck_chain ────────────────

  console.log('\nSection 2: classifyTask() — parked_stuck_chain');

  test('detects exact "PARKED: Stuck chain: 3 retries exhausted"', function() {
    var task = makeTask({ last_error: 'PARKED: Stuck chain: 3 retries exhausted', metadata: { parked: true } });
    var result = classifyTask(task);
    assert.ok(result, 'should detect pattern');
    assert.strictEqual(result.patternId, 'parked_stuck_chain');
  });

  test('detects "PARKED: Stuck chain:" with different retry counts', function() {
    var task = makeTask({ last_error: 'PARKED: Stuck chain: 5 retries exhausted' });
    var result = classifyTask(task);
    assert.ok(result, 'should detect pattern');
    assert.strictEqual(result.patternId, 'parked_stuck_chain');
  });

  test('detects parked_stuck_chain even without metadata.parked (robust detection)', function() {
    // Detection is based on last_error text, NOT metadata — this is intentional
    // so the detector catches tasks regardless of whether metadata was set correctly
    var task = makeTask({ last_error: 'PARKED: Stuck chain: 3 retries exhausted', metadata: null });
    var result = classifyTask(task);
    assert.ok(result, 'should detect even without metadata.parked');
    assert.strictEqual(result.patternId, 'parked_stuck_chain');
  });

  test('does NOT classify unrelated PARKED errors as parked_stuck_chain', function() {
    var task = makeTask({ last_error: 'PARKED: Some other reason' });
    var result = classifyTask(task);
    if (result) {
      assert.notStrictEqual(result.patternId, 'parked_stuck_chain');
    }
  });

  // ── Section 3: classifyTask() — pattern 2: exhausted_spawn_time ──────────────

  console.log('\nSection 3: classifyTask() — exhausted_spawn_time');

  test('detects exact "Max retries exhausted at spawn time"', function() {
    var task = makeTask({ last_error: 'Max retries exhausted at spawn time' });
    var result = classifyTask(task);
    assert.ok(result, 'should detect pattern');
    assert.strictEqual(result.patternId, 'exhausted_spawn_time');
  });

  test('detects exhausted_spawn_time without metadata.parked (these tasks are NOT parked)', function() {
    var task = makeTask({ last_error: 'Max retries exhausted at spawn time', metadata: null });
    var result = classifyTask(task);
    assert.ok(result, 'should detect even without metadata flag');
    assert.strictEqual(result.patternId, 'exhausted_spawn_time');
  });

  test('does NOT classify "Max retries exhausted" (without "at spawn time") as exhausted_spawn_time', function() {
    var task = makeTask({ last_error: 'Max retries exhausted' });
    var result = classifyTask(task);
    if (result) {
      assert.notStrictEqual(result.patternId, 'exhausted_spawn_time');
    }
  });

  test('does NOT classify unrelated retry errors as exhausted_spawn_time', function() {
    var task = makeTask({ last_error: 'Retries exhausted but different message' });
    var result = classifyTask(task);
    if (result) {
      assert.notStrictEqual(result.patternId, 'exhausted_spawn_time');
    }
  });

  // ── Section 4: classifyTask() — pattern 3: parked_verification_no_commits ────

  console.log('\nSection 4: classifyTask() — parked_verification_no_commits');

  test('detects exact "PARKED: Verification failed 3x: no commits on branch dev/abc"', function() {
    var task = makeTask({ last_error: 'PARKED: Verification failed 3x: no commits on branch dev/abc', metadata: { parked: true } });
    var result = classifyTask(task);
    assert.ok(result, 'should detect pattern');
    assert.strictEqual(result.patternId, 'parked_verification_no_commits');
  });

  test('detects pattern with different branch names', function() {
    var task = makeTask({ last_error: 'PARKED: Verification failed 3x: no commits on branch dev/53917095-dev-some-feature' });
    var result = classifyTask(task);
    assert.ok(result, 'should detect any branch name');
    assert.strictEqual(result.patternId, 'parked_verification_no_commits');
  });

  test('detects parked_verification_no_commits without metadata.parked (robust detection)', function() {
    var task = makeTask({ last_error: 'PARKED: Verification failed 3x: no commits on branch dev/xyz', metadata: null });
    var result = classifyTask(task);
    assert.ok(result, 'should detect even without metadata.parked');
    assert.strictEqual(result.patternId, 'parked_verification_no_commits');
  });

  test('does NOT classify "Verification failed: no commits on branch" (without PARKED: 3x) as parked_verification_no_commits', function() {
    var task = makeTask({ last_error: 'Verification failed: no commits on branch dev/abc' });
    var result = classifyTask(task);
    if (result) {
      assert.notStrictEqual(result.patternId, 'parked_verification_no_commits');
    }
  });

  // ── Section 5: classifyTask() — edge cases ───────────────────────────────────

  console.log('\nSection 5: classifyTask() — edge cases');

  test('returns null for null task', function() {
    var result = classifyTask(null);
    assert.strictEqual(result, null);
  });

  test('returns null for task with no last_error', function() {
    var task = makeTask({ last_error: null });
    var result = classifyTask(task);
    assert.strictEqual(result, null);
  });

  test('returns null for task with empty last_error string', function() {
    var task = makeTask({ last_error: '' });
    var result = classifyTask(task);
    assert.strictEqual(result, null);
  });

  test('returns null for task with unrelated last_error', function() {
    var task = makeTask({ last_error: 'Some completely unrelated error message' });
    var result = classifyTask(task);
    assert.strictEqual(result, null);
  });

  test('returns null for task with undefined last_error', function() {
    var task = makeTask({ last_error: undefined });
    var result = classifyTask(task);
    assert.strictEqual(result, null);
  });

  test('returns null for task with non-string last_error (object)', function() {
    var task = makeTask({ last_error: { message: 'PARKED: Stuck chain: 3 retries exhausted' } });
    var result = classifyTask(task);
    assert.strictEqual(result, null);
  });

  test('metadata.parked=true without matching last_error does NOT trigger any pattern', function() {
    var task = makeTask({ last_error: 'Something else entirely', metadata: { parked: true } });
    var result = classifyTask(task);
    assert.strictEqual(result, null, 'should not match just because metadata.parked=true');
  });
}

// ── Async tests ───────────────────────────────────────────────────────────────

function runAsync() {
  var tests = [];

  console.log('\nSection 6: PipelineFixDetector.detect()');

  tests.push(testAsync('returns empty observations when no tasks match', function() {
    var db = makeDb([
      makeTask({ last_error: 'Some unrelated failure' }),
      makeTask({ last_error: 'Another unrelated error' })
    ]);
    var detector = new PipelineFixDetector(db);
    return detector.detect().then(function(obs) {
      assert.strictEqual(obs.parked_stuck_chain.length, 0);
      assert.strictEqual(obs.exhausted_spawn_time.length, 0);
      assert.strictEqual(obs.parked_verification_no_commits.length, 0);
      assert.strictEqual(obs.total, 0);
      assert.ok(obs.detectedAt, 'should have detectedAt timestamp');
    });
  }));

  tests.push(testAsync('detects 1 task of each pattern', function() {
    var db = makeDb([
      makeTask({ id: 't1', last_error: 'PARKED: Stuck chain: 3 retries exhausted', metadata: { parked: true } }),
      makeTask({ id: 't2', last_error: 'Max retries exhausted at spawn time', metadata: null }),
      makeTask({ id: 't3', last_error: 'PARKED: Verification failed 3x: no commits on branch dev/abc', metadata: { parked: true } })
    ]);
    var detector = new PipelineFixDetector(db);
    return detector.detect().then(function(obs) {
      assert.strictEqual(obs.parked_stuck_chain.length, 1, 'expected 1 parked_stuck_chain, got ' + obs.parked_stuck_chain.length);
      assert.strictEqual(obs.exhausted_spawn_time.length, 1, 'expected 1 exhausted_spawn_time, got ' + obs.exhausted_spawn_time.length);
      assert.strictEqual(obs.parked_verification_no_commits.length, 1, 'expected 1 parked_verification_no_commits, got ' + obs.parked_verification_no_commits.length);
      assert.strictEqual(obs.total, 3, 'expected total=3, got ' + obs.total);
    });
  }));

  tests.push(testAsync('detected task has expected fields', function() {
    var db = makeDb([
      makeTask({
        id: 'task-xyz',
        title: 'Dev: Fix auth flow',
        agent_id: 'dev',
        last_error: 'PARKED: Stuck chain: 3 retries exhausted',
        metadata: { parked: true, parked_reason: 'Stuck chain: 3 retries exhausted' },
        retry_count: 3,
        max_retries: 3,
        use_case_id: 'uc-auth-001',
        branch_name: 'dev/auth-fix'
      })
    ]);
    var detector = new PipelineFixDetector(db);
    return detector.detect().then(function(obs) {
      assert.strictEqual(obs.parked_stuck_chain.length, 1);
      var classified = obs.parked_stuck_chain[0];
      assert.strictEqual(classified.id, 'task-xyz');
      assert.strictEqual(classified.title, 'Dev: Fix auth flow');
      assert.strictEqual(classified.agentId, 'dev');
      assert.strictEqual(classified.lastError, 'PARKED: Stuck chain: 3 retries exhausted');
      assert.strictEqual(classified.retryCount, 3);
      assert.strictEqual(classified.maxRetries, 3);
      assert.strictEqual(classified.useCaseId, 'uc-auth-001');
      assert.strictEqual(classified.branchName, 'dev/auth-fix');
      assert.strictEqual(classified.isParked, true);
      assert.strictEqual(classified.patternId, 'parked_stuck_chain');
      assert.strictEqual(classified.severity, 'high');
      assert.ok(classified.recovery, 'should have recovery strategy');
    });
  }));

  tests.push(testAsync('handles multiple tasks of the same pattern', function() {
    var db = makeDb([
      makeTask({ id: 't1', last_error: 'PARKED: Stuck chain: 3 retries exhausted' }),
      makeTask({ id: 't2', last_error: 'PARKED: Stuck chain: 3 retries exhausted' }),
      makeTask({ id: 't3', last_error: 'PARKED: Stuck chain: 3 retries exhausted' }),
      makeTask({ id: 't4', last_error: 'PARKED: Stuck chain: 5 retries exhausted' })
    ]);
    var detector = new PipelineFixDetector(db);
    return detector.detect().then(function(obs) {
      assert.strictEqual(obs.parked_stuck_chain.length, 4, 'expected 4, got ' + obs.parked_stuck_chain.length);
      assert.strictEqual(obs.total, 4);
    });
  }));

  tests.push(testAsync('returns empty observations when DB throws error', function() {
    var errDb = {
      query: function() { return Promise.reject(new Error('DB connection failed')); }
    };
    var detector = new PipelineFixDetector(errDb, {
      logger: { error: function() {}, warn: function() {}, log: function() {} }
    });
    return detector.detect().then(function(obs) {
      assert.strictEqual(obs.parked_stuck_chain.length, 0);
      assert.strictEqual(obs.exhausted_spawn_time.length, 0);
      assert.strictEqual(obs.parked_verification_no_commits.length, 0);
      assert.strictEqual(obs.total, 0);
      assert.ok(obs.detectedAt, 'should still have timestamp');
    });
  }));

  tests.push(testAsync('handles tasks with null metadata gracefully', function() {
    var db = makeDb([
      makeTask({ id: 't1', last_error: 'Max retries exhausted at spawn time', metadata: null }),
      makeTask({ id: 't2', last_error: 'Max retries exhausted at spawn time', metadata: undefined })
    ]);
    var detector = new PipelineFixDetector(db);
    return detector.detect().then(function(obs) {
      assert.strictEqual(obs.exhausted_spawn_time.length, 2);
      assert.strictEqual(obs.exhausted_spawn_time[0].isParked, false);
    });
  }));

  console.log('\nSection 7: PipelineFixDetector.summary()');

  tests.push(testAsync('summary returns counts per pattern', function() {
    var db = makeDb([
      makeTask({ last_error: 'PARKED: Stuck chain: 3 retries exhausted' }),
      makeTask({ last_error: 'PARKED: Stuck chain: 3 retries exhausted' }),
      makeTask({ last_error: 'Max retries exhausted at spawn time' })
    ]);
    var detector = new PipelineFixDetector(db);
    return detector.summary().then(function(sum) {
      assert.strictEqual(sum.parked_stuck_chain, 2);
      assert.strictEqual(sum.exhausted_spawn_time, 1);
      assert.strictEqual(sum.parked_verification_no_commits, 0);
      assert.strictEqual(sum.total, 3);
      assert.ok(sum.detectedAt, 'should have timestamp');
    });
  }));

  tests.push(testAsync('summary returns zeros when nothing detected', function() {
    var db = makeDb([]);
    var detector = new PipelineFixDetector(db);
    return detector.summary().then(function(sum) {
      assert.strictEqual(sum.total, 0);
      assert.strictEqual(sum.parked_stuck_chain, 0);
      assert.strictEqual(sum.exhausted_spawn_time, 0);
      assert.strictEqual(sum.parked_verification_no_commits, 0);
    });
  }));

  return Promise.all(tests);
}

// ── Main ──────────────────────────────────────────────────────────────────────

runSync();
runAsync().then(function() {
  console.log('\n📊 Results: ' + results.passed + ' passed, ' + results.failed + ' failed');
  if (results.failed > 0) {
    process.exit(1);
  } else {
    console.log('✅ All tests passed');
    process.exit(0);
  }
}).catch(function(err) {
  console.error('Test runner error:', err.message);
  process.exit(1);
});

module.exports = { runSync, runAsync };
