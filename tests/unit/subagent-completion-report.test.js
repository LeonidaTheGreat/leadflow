'use strict';

/**
 * Unit tests for subagent-completion-report.js (genome core hub)
 *
 * Spec:
 *   What:   /Users/clawdbot/.openclaw/genome/core/subagent-completion-report.js
 *           (accessed via symlink at leadflow root: subagent-completion-report.js)
 *           Functions: writeCompletionReport, markReportProcessed, getUnprocessedReports,
 *                      reportSuccess, reportFailure, getCompletionDir
 *   Verify: npx jest tests/unit/subagent-completion-report.test.js --no-coverage → all pass, exit 0
 *   Boundaries: Only tests the hub's own logic. Does not touch genome orchestration or
 *               production completion-reports directories.
 */

const os = require('os');
const fs = require('fs');
const path = require('path');

// Mock project-config-loader so tests don't depend on live system config
// Path is the resolved real path (symlink target's dependency)
jest.mock('/Users/clawdbot/.openclaw/genome/core/project-config-loader', () => ({
  getConfig: jest.fn(),
  getProjectDir: jest.fn(),
  getConfigForProject: jest.fn(() => null)
}));

// Mock child_process so reportSuccess doesn't run real git commands
jest.mock('child_process', () => ({
  execSync: jest.fn()
}));

const { getProjectDir, getConfigForProject } = require('/Users/clawdbot/.openclaw/genome/core/project-config-loader');
const { execSync } = require('child_process');

const {
  writeCompletionReport,
  markReportProcessed,
  getUnprocessedReports,
  reportSuccess,
  reportFailure,
  getCompletionDir
} = require('../../subagent-completion-report');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'scr-test-'));
}

function readReport(filepath) {
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

// ─────────────────────────────────────────────────────────────────────────────
// Test suite
// ─────────────────────────────────────────────────────────────────────────────

describe('subagent-completion-report', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    getProjectDir.mockReturnValue(tmpDir);
    getConfigForProject.mockReturnValue(null);
    execSync.mockReset();
    // Default: branch with no commits (safe no-op for reportSuccess)
    execSync.mockImplementation((cmd) => {
      if (cmd === 'git branch --show-current') return 'dev/test-branch\n';
      if (cmd.includes('git log --oneline main..')) return ''; // no commits
      return '';
    });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    jest.clearAllMocks();
  });

  // ── getCompletionDir ────────────────────────────────────────────────────────

  describe('getCompletionDir', () => {
    test('returns path ending in completion-reports inside project dir', () => {
      const dir = getCompletionDir();
      expect(dir).toBe(path.join(tmpDir, 'completion-reports'));
    });

    test('creates completion-reports directory if it does not exist', () => {
      const dir = getCompletionDir();
      expect(fs.existsSync(dir)).toBe(true);
      expect(fs.statSync(dir).isDirectory()).toBe(true);
    });

    test('returns existing path without error when directory already exists', () => {
      const dir = getCompletionDir();
      expect(() => getCompletionDir()).not.toThrow();
      expect(getCompletionDir()).toBe(dir);
    });

    test('uses project-specific dir when getConfigForProject returns a config', () => {
      const projectTmpDir = makeTmpDir();
      try {
        getConfigForProject.mockReturnValueOnce({ project_dir: projectTmpDir });
        const dir = getCompletionDir('some-project');
        expect(dir).toBe(path.join(projectTmpDir, 'completion-reports'));
      } finally {
        fs.rmSync(projectTmpDir, { recursive: true, force: true });
      }
    });

    test('falls back to default project dir when getConfigForProject returns null', () => {
      getConfigForProject.mockReturnValueOnce(null);
      const dir = getCompletionDir('unknown-project');
      expect(dir).toBe(path.join(tmpDir, 'completion-reports'));
    });
  });

  // ── writeCompletionReport ───────────────────────────────────────────────────

  describe('writeCompletionReport', () => {
    const BASE_REPORT = {
      taskId: 'task-abc-123',
      status: 'completed',
      testResults: { passed: 5, total: 5, passRate: 1.0 },
      filesCreated: ['lib/foo.js'],
      filesModified: ['routes/bar.js'],
      completionReportPath: null
    };

    test('returns a filepath string', () => {
      const fp = writeCompletionReport(BASE_REPORT);
      expect(typeof fp).toBe('string');
    });

    test('written file exists on disk', () => {
      const fp = writeCompletionReport(BASE_REPORT);
      expect(fs.existsSync(fp)).toBe(true);
    });

    test('filename follows COMPLETION-{taskId}-{ms}.json pattern', () => {
      const fp = writeCompletionReport(BASE_REPORT);
      const name = path.basename(fp);
      expect(name).toMatch(/^COMPLETION-task-abc-123-\d+\.json$/);
    });

    test('written JSON is valid and parseable', () => {
      const fp = writeCompletionReport(BASE_REPORT);
      expect(() => readReport(fp)).not.toThrow();
    });

    test('includes version 1.0', () => {
      const fp = writeCompletionReport(BASE_REPORT);
      expect(readReport(fp).version).toBe('1.0');
    });

    test('includes timestamp as valid ISO string', () => {
      const fp = writeCompletionReport(BASE_REPORT);
      const { timestamp } = readReport(fp);
      expect(typeof timestamp).toBe('string');
      expect(new Date(timestamp).getTime()).not.toBeNaN();
    });

    test('preserves taskId, status, testResults, filesCreated, filesModified', () => {
      const fp = writeCompletionReport(BASE_REPORT);
      const r = readReport(fp);
      expect(r.taskId).toBe('task-abc-123');
      expect(r.status).toBe('completed');
      expect(r.testResults).toEqual({ passed: 5, total: 5, passRate: 1.0 });
      expect(r.filesCreated).toEqual(['lib/foo.js']);
      expect(r.filesModified).toEqual(['routes/bar.js']);
    });

    test('sets metadata.processed to false', () => {
      const fp = writeCompletionReport(BASE_REPORT);
      expect(readReport(fp).metadata.processed).toBe(false);
    });

    test('sets metadata.processedAt and processedBy to null', () => {
      const fp = writeCompletionReport(BASE_REPORT);
      const { metadata } = readReport(fp);
      expect(metadata.processedAt).toBeNull();
      expect(metadata.processedBy).toBeNull();
    });

    test('defaults testResults to {passed:0,total:0,passRate:0} when omitted', () => {
      const fp = writeCompletionReport({ taskId: 'x', status: 'failed' });
      expect(readReport(fp).testResults).toEqual({ passed: 0, total: 0, passRate: 0 });
    });

    test('defaults filesCreated to [] when omitted', () => {
      const fp = writeCompletionReport({ taskId: 'x', status: 'completed' });
      expect(readReport(fp).filesCreated).toEqual([]);
    });

    test('defaults filesModified to [] when omitted', () => {
      const fp = writeCompletionReport({ taskId: 'x', status: 'completed' });
      expect(readReport(fp).filesModified).toEqual([]);
    });

    test('defaults discoveries to [] when omitted', () => {
      const fp = writeCompletionReport({ taskId: 'x', status: 'completed' });
      expect(readReport(fp).discoveries).toEqual([]);
    });

    test('defaults architecturalDecisions to [] when omitted', () => {
      const fp = writeCompletionReport({ taskId: 'x', status: 'completed' });
      expect(readReport(fp).architecturalDecisions).toEqual([]);
    });

    test('preserves discoveries array when provided', () => {
      const discoveries = [{ category: 'gotcha', summary: 'thing A breaks if Y' }];
      const fp = writeCompletionReport({ ...BASE_REPORT, discoveries });
      expect(readReport(fp).discoveries).toEqual(discoveries);
    });

    test('preserves architecturalDecisions array when provided', () => {
      const decisions = [{ decision: 'Used class', reason: 'SRP', alternatives: 'function' }];
      const fp = writeCompletionReport({ ...BASE_REPORT, architecturalDecisions: decisions });
      expect(readReport(fp).architecturalDecisions).toEqual(decisions);
    });

    test('sets error to null when omitted', () => {
      const fp = writeCompletionReport(BASE_REPORT);
      expect(readReport(fp).error).toBeNull();
    });

    test('preserves error when provided', () => {
      const fp = writeCompletionReport({ ...BASE_REPORT, error: 'something broke' });
      expect(readReport(fp).error).toBe('something broke');
    });

    test('sets retryRecommendation to null when omitted', () => {
      const fp = writeCompletionReport(BASE_REPORT);
      expect(readReport(fp).retryRecommendation).toBeNull();
    });

    test('preserves retryRecommendation when provided', () => {
      const fp = writeCompletionReport({ ...BASE_REPORT, retryRecommendation: 'retry' });
      expect(readReport(fp).retryRecommendation).toBe('retry');
    });

    test('sets prdId to null when omitted', () => {
      const fp = writeCompletionReport(BASE_REPORT);
      expect(readReport(fp).prdId).toBeNull();
    });

    test('preserves prdId when provided', () => {
      const fp = writeCompletionReport({ ...BASE_REPORT, prdId: 'prd-001' });
      expect(readReport(fp).prdId).toBe('prd-001');
    });

    test('sets triageOutcome to null when omitted', () => {
      const fp = writeCompletionReport(BASE_REPORT);
      expect(readReport(fp).triageOutcome).toBeNull();
    });

    test('preserves triageOutcome when provided', () => {
      const outcome = { action: 'new_uc', ucName: 'Fix auth', description: 'desc', workflow: ['dev', 'qc'], reason: 'new' };
      const fp = writeCompletionReport({ ...BASE_REPORT, triageOutcome: outcome });
      expect(readReport(fp).triageOutcome).toEqual(outcome);
    });

    test('preserves rootCauseAnalysis when provided', () => {
      const rca = { failurePoint: 'line 42', why: 'off-by-one', fix: 'use >=', };
      const fp = writeCompletionReport({ ...BASE_REPORT, rootCauseAnalysis: rca });
      expect(readReport(fp).rootCauseAnalysis).toEqual(rca);
    });

    test('sets rootCauseAnalysis to null when omitted', () => {
      const fp = writeCompletionReport(BASE_REPORT);
      expect(readReport(fp).rootCauseAnalysis).toBeNull();
    });

    test('each call creates a distinct file', () => {
      const fp1 = writeCompletionReport({ ...BASE_REPORT, taskId: 'task-1' });
      const fp2 = writeCompletionReport({ ...BASE_REPORT, taskId: 'task-2' });
      expect(fp1).not.toBe(fp2);
      expect(fs.existsSync(fp1)).toBe(true);
      expect(fs.existsSync(fp2)).toBe(true);
    });
  });

  // ── markReportProcessed ─────────────────────────────────────────────────────

  describe('markReportProcessed', () => {
    function writeAndGetPath(overrides = {}) {
      return writeCompletionReport({
        taskId: 'mark-test',
        status: 'completed',
        ...overrides
      });
    }

    test('sets metadata.processed to true', () => {
      const fp = writeAndGetPath();
      markReportProcessed(fp, 'orchestrator-heartbeat');
      expect(readReport(fp).metadata.processed).toBe(true);
    });

    test('sets metadata.processedBy to the provided processor', () => {
      const fp = writeAndGetPath();
      markReportProcessed(fp, 'my-processor');
      expect(readReport(fp).metadata.processedBy).toBe('my-processor');
    });

    test('sets metadata.processedAt to a valid ISO timestamp', () => {
      const fp = writeAndGetPath();
      const before = new Date().toISOString();
      markReportProcessed(fp, 'proc');
      const { processedAt } = readReport(fp).metadata;
      expect(typeof processedAt).toBe('string');
      expect(new Date(processedAt).getTime()).not.toBeNaN();
      expect(processedAt >= before).toBe(true);
    });

    test('preserves all other report fields after marking processed', () => {
      const fp = writeCompletionReport({
        taskId: 'preserve-test',
        status: 'completed',
        testResults: { passed: 3, total: 3, passRate: 1.0 },
        filesCreated: ['new.js'],
        filesModified: []
      });
      markReportProcessed(fp, 'proc');
      const r = readReport(fp);
      expect(r.taskId).toBe('preserve-test');
      expect(r.status).toBe('completed');
      expect(r.testResults).toEqual({ passed: 3, total: 3, passRate: 1.0 });
    });

    test('handles report with pre-existing metadata object', () => {
      const fp = writeAndGetPath();
      // Manually set metadata without the standard keys
      const r = readReport(fp);
      r.metadata = {}; // strip keys
      fs.writeFileSync(fp, JSON.stringify(r));

      expect(() => markReportProcessed(fp, 'proc')).not.toThrow();
      expect(readReport(fp).metadata.processed).toBe(true);
    });
  });

  // ── getUnprocessedReports ───────────────────────────────────────────────────

  describe('getUnprocessedReports', () => {
    test('returns empty array when completion-reports directory does not exist', () => {
      // tmpDir exists but completion-reports/ does NOT yet
      const freshTmp = makeTmpDir();
      getProjectDir.mockReturnValueOnce(freshTmp);
      try {
        const reports = getUnprocessedReports();
        expect(reports).toEqual([]);
      } finally {
        fs.rmSync(freshTmp, { recursive: true, force: true });
      }
    });

    test('returns unprocessed reports as objects with _filepath field', () => {
      const fp = writeCompletionReport({ taskId: 'unproc-1', status: 'completed' });
      const reports = getUnprocessedReports();
      expect(reports.length).toBeGreaterThanOrEqual(1);
      const match = reports.find(r => r.taskId === 'unproc-1');
      expect(match).toBeDefined();
      expect(match._filepath).toBe(fp);
    });

    test('excludes reports where metadata.processed is true', () => {
      const fp = writeCompletionReport({ taskId: 'processed-task', status: 'completed' });
      markReportProcessed(fp, 'proc');
      const reports = getUnprocessedReports();
      const match = reports.find(r => r.taskId === 'processed-task');
      expect(match).toBeUndefined();
    });

    test('includes reports where metadata.processed is false', () => {
      writeCompletionReport({ taskId: 'still-pending', status: 'completed' });
      const reports = getUnprocessedReports();
      const match = reports.find(r => r.taskId === 'still-pending');
      expect(match).toBeDefined();
    });

    test('ignores files that do not match COMPLETION-*.json pattern', () => {
      // Write a non-matching file into completion-reports
      const dir = getCompletionDir();
      fs.writeFileSync(path.join(dir, 'OTHER-file.json'), JSON.stringify({ taskId: 'should-ignore' }));
      fs.writeFileSync(path.join(dir, 'COMPLETION-valid-123.json'), JSON.stringify({
        taskId: 'valid', status: 'completed', timestamp: new Date().toISOString(),
        metadata: { processed: false, processedAt: null, processedBy: null }
      }));

      const reports = getUnprocessedReports();
      expect(reports.find(r => r.taskId === 'should-ignore')).toBeUndefined();
      expect(reports.find(r => r.taskId === 'valid')).toBeDefined();
    });

    test('skips files with invalid JSON without throwing', () => {
      const dir = getCompletionDir();
      fs.writeFileSync(path.join(dir, 'COMPLETION-broken.json'), 'NOT VALID JSON {{{{');
      expect(() => getUnprocessedReports()).not.toThrow();
    });

    test('returns reports sorted by timestamp oldest first', () => {
      const t1 = new Date(Date.now() - 10000).toISOString();
      const t2 = new Date(Date.now() - 5000).toISOString();
      const t3 = new Date().toISOString();

      const dir = getCompletionDir();
      for (const [ts, id] of [[t2, 'mid'], [t3, 'newest'], [t1, 'oldest']]) {
        fs.writeFileSync(
          path.join(dir, `COMPLETION-${id}-${Date.now()}.json`),
          JSON.stringify({ taskId: id, status: 'completed', timestamp: ts, metadata: { processed: false } })
        );
      }

      const reports = getUnprocessedReports();
      const ids = reports.filter(r => ['oldest', 'mid', 'newest'].includes(r.taskId)).map(r => r.taskId);
      expect(ids).toEqual(['oldest', 'mid', 'newest']);
    });

    test('returns empty array when all reports have been processed', () => {
      const fp1 = writeCompletionReport({ taskId: 'done-1', status: 'completed' });
      const fp2 = writeCompletionReport({ taskId: 'done-2', status: 'completed' });
      markReportProcessed(fp1, 'proc');
      markReportProcessed(fp2, 'proc');
      const reports = getUnprocessedReports();
      expect(reports.filter(r => ['done-1', 'done-2'].includes(r.taskId))).toHaveLength(0);
    });
  });

  // ── reportFailure ───────────────────────────────────────────────────────────

  describe('reportFailure', () => {
    test('writes a report with status failed', () => {
      const fp = reportFailure('fail-task', 'something went wrong', null, 'retry');
      expect(readReport(fp).status).toBe('failed');
    });

    test('includes the error message', () => {
      const fp = reportFailure('fail-task', 'out of memory', null, null);
      expect(readReport(fp).error).toBe('out of memory');
    });

    test('includes retryRecommendation when provided', () => {
      const fp = reportFailure('fail-task', 'err', null, 'decompose');
      expect(readReport(fp).retryRecommendation).toBe('decompose');
    });

    test('sets retryRecommendation to null when not provided', () => {
      const fp = reportFailure('fail-task', 'err');
      expect(readReport(fp).retryRecommendation).toBeNull();
    });

    test('defaults testResults to {passed:0,total:0,passRate:0} when null', () => {
      const fp = reportFailure('fail-task', 'err', null);
      expect(readReport(fp).testResults).toEqual({ passed: 0, total: 0, passRate: 0 });
    });

    test('uses provided testResults when supplied', () => {
      const fp = reportFailure('fail-task', 'err', { passed: 2, total: 5, passRate: 0.4 });
      expect(readReport(fp).testResults).toEqual({ passed: 2, total: 5, passRate: 0.4 });
    });

    test('sets filesCreated and filesModified to empty arrays', () => {
      const fp = reportFailure('fail-task', 'err');
      const r = readReport(fp);
      expect(r.filesCreated).toEqual([]);
      expect(r.filesModified).toEqual([]);
    });

    test('sets taskId correctly', () => {
      const fp = reportFailure('my-specific-task', 'err');
      expect(readReport(fp).taskId).toBe('my-specific-task');
    });
  });

  // ── reportSuccess ───────────────────────────────────────────────────────────

  describe('reportSuccess', () => {
    const TEST_RESULTS = { passed: 10, total: 10, passRate: 1.0 };

    test('writes a report with status completed', () => {
      const fp = reportSuccess('s-task', TEST_RESULTS, [], [], null);
      expect(readReport(fp).status).toBe('completed');
    });

    test('preserves taskId', () => {
      const fp = reportSuccess('my-task-id', TEST_RESULTS, [], [], null);
      expect(readReport(fp).taskId).toBe('my-task-id');
    });

    test('preserves testResults', () => {
      const fp = reportSuccess('t', TEST_RESULTS, [], [], null);
      expect(readReport(fp).testResults).toEqual(TEST_RESULTS);
    });

    test('preserves filesCreated and filesModified', () => {
      const fp = reportSuccess('t', TEST_RESULTS, ['lib/new.js'], ['routes/old.js'], null);
      const r = readReport(fp);
      expect(r.filesCreated).toEqual(['lib/new.js']);
      expect(r.filesModified).toEqual(['routes/old.js']);
    });

    test('merges extras fields into the report', () => {
      const fp = reportSuccess('t', TEST_RESULTS, [], [], null, { prdId: 'prd-999', prdFilePath: '/path/to/prd.md' });
      const r = readReport(fp);
      expect(r.prdId).toBe('prd-999');
      expect(r.prdFilePath).toBe('/path/to/prd.md');
    });

    test('returns a filepath string', () => {
      const fp = reportSuccess('t', TEST_RESULTS, [], [], null);
      expect(typeof fp).toBe('string');
    });

    test('warns (not throws) when on branch with no commits', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      execSync.mockImplementation((cmd) => {
        if (cmd === 'git branch --show-current') return 'dev/feature\n';
        if (cmd.includes('git log --oneline main..')) return ''; // no commits
        return '';
      });
      expect(() => reportSuccess('t', TEST_RESULTS, [], [], null)).not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('No commits'));
      warnSpy.mockRestore();
    });

    test('does not warn when git check returns null (git unavailable)', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      execSync.mockImplementation(() => { throw new Error('git not found'); });
      expect(() => reportSuccess('t', TEST_RESULTS, [], [], null)).not.toThrow();
      // The git-unavailable path falls through cleanly — no "No commits" warn
      const noCommitWarns = warnSpy.mock.calls.filter(args => args[0].includes('No commits'));
      expect(noCommitWarns).toHaveLength(0);
      warnSpy.mockRestore();
    });

    test('does not try to rebase/push when on main branch', () => {
      execSync.mockImplementation((cmd) => {
        if (cmd === 'git branch --show-current') return 'main\n';
        return '';
      });
      reportSuccess('t', TEST_RESULTS, [], [], null);
      const pushCalls = execSync.mock.calls.filter(args => args[0].includes('push'));
      expect(pushCalls).toHaveLength(0);
    });

    test('attempts rebase when branch has commits', () => {
      execSync.mockImplementation((cmd) => {
        if (cmd === 'git branch --show-current') return 'dev/feature\n';
        if (cmd.includes('git log --oneline main..dev')) return 'abc123 feat: something\n';
        if (cmd === 'git fetch origin main') return '';
        if (cmd === 'git rebase origin/main') return '';
        if (cmd.includes('git log --oneline origin/dev')) return ''; // no unpushed
        return '';
      });
      reportSuccess('t', TEST_RESULTS, [], [], null);
      const rebaseCalls = execSync.mock.calls.filter(args => String(args[0]).includes('rebase origin/main'));
      expect(rebaseCalls.length).toBeGreaterThanOrEqual(1);
    });

    test('handles rebase failure gracefully (warns, does not throw)', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      execSync.mockImplementation((cmd) => {
        if (cmd === 'git branch --show-current') return 'dev/feature\n';
        if (cmd.includes('git log --oneline main..')) return 'abc123 feat: something\n';
        if (cmd === 'git fetch origin main') return '';
        if (cmd === 'git rebase origin/main') throw new Error('conflict!');
        if (cmd === 'git rebase --abort') return '';
        return '';
      });
      expect(() => reportSuccess('t', TEST_RESULTS, [], [], null)).not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Rebase'));
      warnSpy.mockRestore();
    });
  });

  // ── module exports ──────────────────────────────────────────────────────────

  describe('module exports', () => {
    const mod = require('../../subagent-completion-report');

    test('exports writeCompletionReport', () => expect(typeof mod.writeCompletionReport).toBe('function'));
    test('exports markReportProcessed', () => expect(typeof mod.markReportProcessed).toBe('function'));
    test('exports getUnprocessedReports', () => expect(typeof mod.getUnprocessedReports).toBe('function'));
    test('exports reportSuccess', () => expect(typeof mod.reportSuccess).toBe('function'));
    test('exports reportFailure', () => expect(typeof mod.reportFailure).toBe('function'));
    test('exports getCompletionDir', () => expect(typeof mod.getCompletionDir).toBe('function'));
    test('exports exactly 6 public symbols', () => {
      const keys = Object.keys(mod);
      expect(keys).toHaveLength(6);
    });
  });
});
