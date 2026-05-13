'use strict';

/**
 * Unit tests for subagent-completion-report.js
 *
 * Spec:
 *   What:   All 6 exports from subagent-completion-report.js (symlink at project root →
 *           ~/.openclaw/genome/core/subagent-completion-report.js):
 *           writeCompletionReport, markReportProcessed, getUnprocessedReports,
 *           reportSuccess, reportFailure, getCompletionDir
 *   Verify: npx jest tests/unit/subagent-completion-report.test.js --no-coverage → exit 0
 *   Boundaries: subagent-completion-report.js and project-config-loader.js are read-only.
 *               Only tests/unit/subagent-completion-report.test.js is created/modified.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

// Mock child_process before requiring the module under test.
// The real file (resolved via symlink) imports execSync at the top level.
jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

// Mock project-config-loader using the real resolved path (symlink __dirname →
// ~/.openclaw/genome/core/ so that's where ./project-config-loader resolves to).
jest.mock('/Users/clawdbot/.openclaw/genome/core/project-config-loader', () => ({
  getConfig: jest.fn(() => ({ project_id: 'test', project_dir: '/tmp/sar-default' })),
  getProjectDir: jest.fn(() => '/tmp/sar-default'),
  getConfigForProject: jest.fn(() => null),
}));

const { execSync } = require('child_process');
const {
  getProjectDir,
  getConfigForProject,
} = require('/Users/clawdbot/.openclaw/genome/core/project-config-loader');

const {
  writeCompletionReport,
  markReportProcessed,
  getUnprocessedReports,
  reportSuccess,
  reportFailure,
  getCompletionDir,
} = require('../../subagent-completion-report');

// ── helpers ──────────────────────────────────────────────────────────────────

function readReport(fp) {
  return JSON.parse(fs.readFileSync(fp, 'utf-8'));
}

// ── shared state ─────────────────────────────────────────────────────────────

let tempDir;
let completionDir;

beforeAll(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sar-test-'));
  completionDir = path.join(tempDir, 'completion-reports');
});

beforeEach(() => {
  jest.clearAllMocks();
  getProjectDir.mockReturnValue(tempDir);
  getConfigForProject.mockReturnValue(null);
  // Wipe completion-reports between tests to keep assertions isolated
  if (fs.existsSync(completionDir)) {
    for (const f of fs.readdirSync(completionDir)) {
      fs.unlinkSync(path.join(completionDir, f));
    }
  }
});

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

// ── getCompletionDir ──────────────────────────────────────────────────────────

describe('getCompletionDir', () => {
  test('returns a path ending with completion-reports', () => {
    const dir = getCompletionDir();
    expect(dir).toMatch(/completion-reports$/);
  });

  test('without projectId uses getProjectDir() result', () => {
    const dir = getCompletionDir();
    expect(dir).toBe(path.join(tempDir, 'completion-reports'));
  });

  test('creates the directory when it does not exist', () => {
    const newTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sar-dir-'));
    try {
      getProjectDir.mockReturnValue(newTmp);
      const dir = getCompletionDir();
      expect(fs.existsSync(dir)).toBe(true);
      expect(fs.statSync(dir).isDirectory()).toBe(true);
    } finally {
      fs.rmSync(newTmp, { recursive: true, force: true });
      getProjectDir.mockReturnValue(tempDir);
    }
  });

  test('with unknown projectId (no config) falls back to getProjectDir()', () => {
    getConfigForProject.mockReturnValue(null);
    const dir = getCompletionDir('unknown-project');
    expect(dir).toBe(path.join(tempDir, 'completion-reports'));
  });

  test('with projectId and matching config uses project-specific dir', () => {
    const otherTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sar-other-'));
    try {
      getConfigForProject.mockReturnValue({ project_id: 'other', project_dir: otherTmp });
      const dir = getCompletionDir('other');
      expect(dir).toBe(path.join(otherTmp, 'completion-reports'));
      expect(fs.existsSync(dir)).toBe(true);
    } finally {
      fs.rmSync(otherTmp, { recursive: true, force: true });
    }
  });

  test('returns same dir on repeated calls', () => {
    const dir1 = getCompletionDir();
    const dir2 = getCompletionDir();
    expect(dir1).toBe(dir2);
  });
});

// ── writeCompletionReport ─────────────────────────────────────────────────────

describe('writeCompletionReport', () => {
  test('returns the filepath of the written file', () => {
    const fp = writeCompletionReport({ taskId: 'task-1', status: 'completed' });
    expect(typeof fp).toBe('string');
    expect(fp).toMatch(/COMPLETION-task-1-\d+\.json$/);
  });

  test('creates a valid JSON file on disk', () => {
    const fp = writeCompletionReport({ taskId: 'task-2', status: 'completed' });
    expect(fs.existsSync(fp)).toBe(true);
    expect(() => readReport(fp)).not.toThrow();
  });

  test('file is placed in the completion-reports directory', () => {
    const fp = writeCompletionReport({ taskId: 'task-dir', status: 'completed' });
    expect(path.dirname(fp)).toBe(path.join(tempDir, 'completion-reports'));
  });

  test('sets version to "1.0"', () => {
    const fp = writeCompletionReport({ taskId: 'task-ver', status: 'completed' });
    expect(readReport(fp).version).toBe('1.0');
  });

  test('sets taskId from report', () => {
    const fp = writeCompletionReport({ taskId: 'my-task-id', status: 'completed' });
    expect(readReport(fp).taskId).toBe('my-task-id');
  });

  test('sets status "completed"', () => {
    const fp = writeCompletionReport({ taskId: 'task-sc', status: 'completed' });
    expect(readReport(fp).status).toBe('completed');
  });

  test('sets status "failed"', () => {
    const fp = writeCompletionReport({ taskId: 'task-sf', status: 'failed' });
    expect(readReport(fp).status).toBe('failed');
  });

  test('sets status "partial"', () => {
    const fp = writeCompletionReport({ taskId: 'task-sp', status: 'partial' });
    expect(readReport(fp).status).toBe('partial');
  });

  test('sets timestamp as ISO 8601 string', () => {
    const fp = writeCompletionReport({ taskId: 'task-ts', status: 'completed' });
    const { timestamp } = readReport(fp);
    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(Number.isNaN(new Date(timestamp).getTime())).toBe(false);
  });

  test('defaults testResults to zeros when omitted', () => {
    const fp = writeCompletionReport({ taskId: 'task-tr', status: 'completed' });
    expect(readReport(fp).testResults).toEqual({ passed: 0, total: 0, passRate: 0 });
  });

  test('uses provided testResults', () => {
    const tr = { passed: 10, total: 12, passRate: 0.833 };
    const fp = writeCompletionReport({ taskId: 'task-tr2', status: 'completed', testResults: tr });
    expect(readReport(fp).testResults).toEqual(tr);
  });

  test('defaults filesCreated to empty array', () => {
    const fp = writeCompletionReport({ taskId: 'task-fc', status: 'completed' });
    expect(readReport(fp).filesCreated).toEqual([]);
  });

  test('uses provided filesCreated', () => {
    const fp = writeCompletionReport({
      taskId: 'task-fc2', status: 'completed', filesCreated: ['a.js', 'b.js'],
    });
    expect(readReport(fp).filesCreated).toEqual(['a.js', 'b.js']);
  });

  test('defaults filesModified to empty array', () => {
    const fp = writeCompletionReport({ taskId: 'task-fm', status: 'completed' });
    expect(readReport(fp).filesModified).toEqual([]);
  });

  test('uses provided filesModified', () => {
    const fp = writeCompletionReport({
      taskId: 'task-fm2', status: 'completed', filesModified: ['x.js'],
    });
    expect(readReport(fp).filesModified).toEqual(['x.js']);
  });

  test('error defaults to null', () => {
    const fp = writeCompletionReport({ taskId: 'task-err', status: 'completed' });
    expect(readReport(fp).error).toBeNull();
  });

  test('uses provided error string', () => {
    const fp = writeCompletionReport({ taskId: 'task-err2', status: 'failed', error: 'Build failed' });
    expect(readReport(fp).error).toBe('Build failed');
  });

  test('retryRecommendation defaults to null', () => {
    const fp = writeCompletionReport({ taskId: 'task-rr', status: 'completed' });
    expect(readReport(fp).retryRecommendation).toBeNull();
  });

  test('uses provided retryRecommendation', () => {
    const fp = writeCompletionReport({
      taskId: 'task-rr2', status: 'failed', retryRecommendation: 'decompose',
    });
    expect(readReport(fp).retryRecommendation).toBe('decompose');
  });

  test('prdId defaults to null', () => {
    const fp = writeCompletionReport({ taskId: 'task-prd', status: 'completed' });
    expect(readReport(fp).prdId).toBeNull();
  });

  test('uses provided prdId', () => {
    const fp = writeCompletionReport({ taskId: 'task-prd2', status: 'completed', prdId: 'prd-42' });
    expect(readReport(fp).prdId).toBe('prd-42');
  });

  test('prdFilePath defaults to null', () => {
    const fp = writeCompletionReport({ taskId: 'task-pfp', status: 'completed' });
    expect(readReport(fp).prdFilePath).toBeNull();
  });

  test('uses provided prdFilePath', () => {
    const fp = writeCompletionReport({
      taskId: 'task-pfp2', status: 'completed', prdFilePath: '/docs/prd.md',
    });
    expect(readReport(fp).prdFilePath).toBe('/docs/prd.md');
  });

  test('affectedProjects defaults to null', () => {
    const fp = writeCompletionReport({ taskId: 'task-ap', status: 'completed' });
    expect(readReport(fp).affectedProjects).toBeNull();
  });

  test('uses provided affectedProjects', () => {
    const fp = writeCompletionReport({
      taskId: 'task-ap2', status: 'completed', affectedProjects: ['proj-a', 'proj-b'],
    });
    expect(readReport(fp).affectedProjects).toEqual(['proj-a', 'proj-b']);
  });

  test('triageOutcome defaults to null', () => {
    const fp = writeCompletionReport({ taskId: 'task-to', status: 'completed' });
    expect(readReport(fp).triageOutcome).toBeNull();
  });

  test('uses provided triageOutcome', () => {
    const to = { action: 'new_uc', ucName: 'Test UC', reason: 'New feature requested' };
    const fp = writeCompletionReport({ taskId: 'task-to2', status: 'completed', triageOutcome: to });
    expect(readReport(fp).triageOutcome).toEqual(to);
  });

  test('discoveries defaults to empty array when omitted', () => {
    const fp = writeCompletionReport({ taskId: 'task-disc', status: 'completed' });
    expect(readReport(fp).discoveries).toEqual([]);
  });

  test('discoveries defaults to empty array when not an array', () => {
    const fp = writeCompletionReport({
      taskId: 'task-disc-bad', status: 'completed', discoveries: 'not-array',
    });
    expect(readReport(fp).discoveries).toEqual([]);
  });

  test('uses provided discoveries array', () => {
    const disc = [{ category: 'gotcha', summary: 'Watch out for X!' }];
    const fp = writeCompletionReport({ taskId: 'task-disc2', status: 'completed', discoveries: disc });
    expect(readReport(fp).discoveries).toEqual(disc);
  });

  test('rootCauseAnalysis defaults to null', () => {
    const fp = writeCompletionReport({ taskId: 'task-rca', status: 'completed' });
    expect(readReport(fp).rootCauseAnalysis).toBeNull();
  });

  test('uses provided rootCauseAnalysis', () => {
    const rca = { failurePoint: 'line 42', why: 'off-by-one', fix: 'subtract 1' };
    const fp = writeCompletionReport({ taskId: 'task-rca2', status: 'completed', rootCauseAnalysis: rca });
    expect(readReport(fp).rootCauseAnalysis).toEqual(rca);
  });

  test('architecturalDecisions defaults to empty array when omitted', () => {
    const fp = writeCompletionReport({ taskId: 'task-ad', status: 'completed' });
    expect(readReport(fp).architecturalDecisions).toEqual([]);
  });

  test('architecturalDecisions defaults to empty array when null', () => {
    const fp = writeCompletionReport({
      taskId: 'task-ad-null', status: 'completed', architecturalDecisions: null,
    });
    expect(readReport(fp).architecturalDecisions).toEqual([]);
  });

  test('uses provided architecturalDecisions', () => {
    const ad = [{ decision: 'Created FooService', reason: 'SRP', alternatives: 'Extend BarService' }];
    const fp = writeCompletionReport({
      taskId: 'task-ad2', status: 'completed', architecturalDecisions: ad,
    });
    expect(readReport(fp).architecturalDecisions).toEqual(ad);
  });

  test('metadata.processed is false initially', () => {
    const fp = writeCompletionReport({ taskId: 'task-meta', status: 'completed' });
    expect(readReport(fp).metadata.processed).toBe(false);
  });

  test('metadata.processedAt is null initially', () => {
    const fp = writeCompletionReport({ taskId: 'task-meta2', status: 'completed' });
    expect(readReport(fp).metadata.processedAt).toBeNull();
  });

  test('metadata.processedBy is null initially', () => {
    const fp = writeCompletionReport({ taskId: 'task-meta3', status: 'completed' });
    expect(readReport(fp).metadata.processedBy).toBeNull();
  });

  test('includes completionReportPath when provided', () => {
    const fp = writeCompletionReport({
      taskId: 'task-crp', status: 'completed', completionReportPath: '/reports/detail.json',
    });
    expect(readReport(fp).completionReportPath).toBe('/reports/detail.json');
  });
});

// ── markReportProcessed ───────────────────────────────────────────────────────

describe('markReportProcessed', () => {
  function writeTestReport(taskId) {
    return writeCompletionReport({ taskId, status: 'completed' });
  }

  test('sets metadata.processed to true', () => {
    const fp = writeTestReport('mrp-1');
    markReportProcessed(fp, 'test-processor');
    expect(readReport(fp).metadata.processed).toBe(true);
  });

  test('sets metadata.processedAt to an ISO timestamp', () => {
    const fp = writeTestReport('mrp-2');
    markReportProcessed(fp, 'test-processor');
    const { processedAt } = readReport(fp).metadata;
    expect(processedAt).toBeTruthy();
    expect(Number.isNaN(new Date(processedAt).getTime())).toBe(false);
  });

  test('sets metadata.processedBy to the processor string', () => {
    const fp = writeTestReport('mrp-3');
    markReportProcessed(fp, 'orchestrator-heartbeat');
    expect(readReport(fp).metadata.processedBy).toBe('orchestrator-heartbeat');
  });

  test('preserves all other report fields after marking processed', () => {
    const fp = writeCompletionReport({
      taskId: 'mrp-preserve',
      status: 'completed',
      testResults: { passed: 7, total: 7, passRate: 1 },
      filesCreated: ['new.js'],
    });
    markReportProcessed(fp, 'proc');
    const report = readReport(fp);
    expect(report.taskId).toBe('mrp-preserve');
    expect(report.testResults.passed).toBe(7);
    expect(report.filesCreated).toEqual(['new.js']);
  });

  test('writes the updated metadata to disk (persists across reads)', () => {
    const fp = writeTestReport('mrp-persist');
    expect(readReport(fp).metadata.processed).toBe(false);
    markReportProcessed(fp, 'proc');
    expect(readReport(fp).metadata.processed).toBe(true);
  });

  test('adds metadata object when missing from an existing report', () => {
    const fp = path.join(completionDir, 'COMPLETION-mrp-no-meta-99999.json');
    fs.mkdirSync(completionDir, { recursive: true });
    fs.writeFileSync(fp, JSON.stringify({ taskId: 'mrp-no-meta', status: 'completed' }));
    markReportProcessed(fp, 'proc');
    const report = readReport(fp);
    expect(report.metadata.processed).toBe(true);
    expect(report.metadata.processedBy).toBe('proc');
  });
});

// ── getUnprocessedReports ─────────────────────────────────────────────────────

describe('getUnprocessedReports', () => {
  function makeReport(taskId, opts = {}) {
    const {
      processed = false,
      timestamp = new Date().toISOString(),
    } = opts;
    fs.mkdirSync(completionDir, { recursive: true });
    // Use a unique timestamp suffix to avoid filename collisions in tight loops
    const suffix = Date.now() + Math.random();
    const filename = `COMPLETION-${taskId}-${suffix}.json`;
    const fp = path.join(completionDir, filename);
    const report = {
      version: '1.0',
      timestamp,
      taskId,
      status: 'completed',
      metadata: {
        processed,
        processedAt: processed ? new Date().toISOString() : null,
        processedBy: processed ? 'test' : null,
      },
    };
    fs.writeFileSync(fp, JSON.stringify(report));
    return fp;
  }

  test('returns empty array when completion-reports directory is empty', () => {
    fs.mkdirSync(completionDir, { recursive: true });
    expect(getUnprocessedReports()).toEqual([]);
  });

  test('returns unprocessed reports', () => {
    makeReport('gur-1', { processed: false });
    const reports = getUnprocessedReports();
    expect(reports.length).toBe(1);
    expect(reports[0].taskId).toBe('gur-1');
  });

  test('skips processed reports', () => {
    makeReport('gur-proc', { processed: true });
    const reports = getUnprocessedReports();
    expect(reports.find((r) => r.taskId === 'gur-proc')).toBeUndefined();
  });

  test('skips files not starting with COMPLETION-', () => {
    fs.mkdirSync(completionDir, { recursive: true });
    fs.writeFileSync(path.join(completionDir, 'OTHER-task.json'), JSON.stringify({ taskId: 'other' }));
    const reports = getUnprocessedReports();
    expect(reports.find((r) => r.taskId === 'other')).toBeUndefined();
  });

  test('skips files not ending with .json', () => {
    fs.mkdirSync(completionDir, { recursive: true });
    fs.writeFileSync(path.join(completionDir, 'COMPLETION-task.txt'), JSON.stringify({ taskId: 'txt' }));
    const reports = getUnprocessedReports();
    expect(reports.find((r) => r.taskId === 'txt')).toBeUndefined();
  });

  test('adds _filepath property to each returned report', () => {
    makeReport('gur-fp');
    const reports = getUnprocessedReports();
    expect(reports[0]._filepath).toBeTruthy();
    expect(reports[0]._filepath).toMatch(/\.json$/);
    expect(fs.existsSync(reports[0]._filepath)).toBe(true);
  });

  test('returns reports sorted by timestamp ascending (oldest first)', () => {
    const t1 = '2026-01-01T10:00:00.000Z';
    const t2 = '2026-01-01T11:00:00.000Z';
    const t3 = '2026-01-01T12:00:00.000Z';
    makeReport('gur-sort-b', { timestamp: t2 });
    makeReport('gur-sort-a', { timestamp: t1 });
    makeReport('gur-sort-c', { timestamp: t3 });
    const reports = getUnprocessedReports();
    const ids = reports.map((r) => r.taskId);
    expect(ids.indexOf('gur-sort-a')).toBeLessThan(ids.indexOf('gur-sort-b'));
    expect(ids.indexOf('gur-sort-b')).toBeLessThan(ids.indexOf('gur-sort-c'));
  });

  test('does not crash on a malformed JSON file', () => {
    fs.mkdirSync(completionDir, { recursive: true });
    fs.writeFileSync(path.join(completionDir, 'COMPLETION-bad-9999.json'), 'not-valid-json{{{');
    expect(() => getUnprocessedReports()).not.toThrow();
  });

  test('excludes malformed files from results', () => {
    fs.mkdirSync(completionDir, { recursive: true });
    fs.writeFileSync(path.join(completionDir, 'COMPLETION-bad-8888.json'), 'invalid');
    makeReport('gur-valid');
    const reports = getUnprocessedReports();
    expect(reports.every((r) => r.taskId !== undefined)).toBe(true);
  });

  test('returns only unprocessed from a mixed set', () => {
    makeReport('gur-mix-proc', { processed: true });
    makeReport('gur-mix-unproc', { processed: false });
    const reports = getUnprocessedReports();
    const ids = reports.map((r) => r.taskId);
    expect(ids).toContain('gur-mix-unproc');
    expect(ids).not.toContain('gur-mix-proc');
  });

  test('_filepath points to the correct file on disk', () => {
    const written = makeReport('gur-fp-check');
    const reports = getUnprocessedReports();
    const match = reports.find((r) => r.taskId === 'gur-fp-check');
    expect(match).toBeDefined();
    expect(match._filepath).toBe(written);
  });
});

// ── reportFailure ─────────────────────────────────────────────────────────────

describe('reportFailure', () => {
  test('writes a report with status "failed"', () => {
    const fp = reportFailure('fail-1', 'Build broke', null, 'retry');
    expect(readReport(fp).status).toBe('failed');
  });

  test('returns a filepath that exists on disk', () => {
    const fp = reportFailure('fail-2', 'error msg', null);
    expect(typeof fp).toBe('string');
    expect(fs.existsSync(fp)).toBe(true);
  });

  test('sets error field from the parameter', () => {
    const fp = reportFailure('fail-3', 'Something went wrong', null);
    expect(readReport(fp).error).toBe('Something went wrong');
  });

  test('sets retryRecommendation when provided', () => {
    const fp = reportFailure('fail-4', 'err', null, 'decompose');
    expect(readReport(fp).retryRecommendation).toBe('decompose');
  });

  test('retryRecommendation is null when omitted', () => {
    const fp = reportFailure('fail-5', 'err', null);
    expect(readReport(fp).retryRecommendation).toBeNull();
  });

  test('defaults testResults to zeros when null', () => {
    const fp = reportFailure('fail-6', 'err', null);
    expect(readReport(fp).testResults).toEqual({ passed: 0, total: 0, passRate: 0 });
  });

  test('uses provided testResults', () => {
    const tr = { passed: 3, total: 10, passRate: 0.3 };
    const fp = reportFailure('fail-7', 'err', tr);
    expect(readReport(fp).testResults).toEqual(tr);
  });

  test('sets filesCreated to empty array', () => {
    const fp = reportFailure('fail-8', 'err', null);
    expect(readReport(fp).filesCreated).toEqual([]);
  });

  test('sets filesModified to empty array', () => {
    const fp = reportFailure('fail-9', 'err', null);
    expect(readReport(fp).filesModified).toEqual([]);
  });

  test('sets completionReportPath to null', () => {
    const fp = reportFailure('fail-10', 'err', null);
    expect(readReport(fp).completionReportPath).toBeNull();
  });

  test('sets taskId correctly', () => {
    const fp = reportFailure('fail-task-id', 'err', null);
    expect(readReport(fp).taskId).toBe('fail-task-id');
  });

  test('filename includes task id', () => {
    const fp = reportFailure('fail-name', 'err', null);
    expect(path.basename(fp)).toMatch(/^COMPLETION-fail-name-\d+\.json$/);
  });
});

// ── reportSuccess ─────────────────────────────────────────────────────────────

describe('reportSuccess', () => {
  // ── git mock helpers ─────────────────────────────────────────────────────
  function mockGitNoCommits() {
    execSync.mockImplementation((cmd) => {
      if (cmd === 'git branch --show-current') return 'feature-branch\n';
      if (cmd.startsWith('git log --oneline main..')) return ''; // no commits ahead
      if (cmd === 'git fetch origin main') return '';
      if (cmd === 'git pull --ff-only origin main') return '';
      return '';
    });
  }

  function mockGitWithCommitsPushed() {
    execSync.mockImplementation((cmd) => {
      if (cmd === 'git branch --show-current') return 'feature-branch\n';
      if (cmd.startsWith('git log --oneline main..')) return 'abc123 feat: something\n';
      if (cmd === 'git fetch origin main') return '';
      if (cmd === 'git rebase origin/main') return '';
      if (cmd.startsWith('git log --oneline origin/')) return ''; // already pushed
      return '';
    });
  }

  function mockGitWithCommitsUnpushed() {
    execSync.mockImplementation((cmd) => {
      if (cmd === 'git branch --show-current') return 'feature-branch\n';
      if (cmd.startsWith('git log --oneline main..')) return 'abc123 feat: something\n';
      if (cmd === 'git fetch origin main') return '';
      if (cmd === 'git rebase origin/main') return '';
      if (cmd.startsWith('git log --oneline origin/feature-branch..')) return 'abc123 unpushed commit\n';
      if (cmd.startsWith('git push -u origin feature-branch')) return '';
      return '';
    });
  }

  function mockGitOnMain() {
    execSync.mockImplementation((cmd) => {
      if (cmd === 'git branch --show-current') return 'main\n';
      return '';
    });
  }

  function mockGitFails() {
    execSync.mockImplementation(() => {
      throw new Error('git not available');
    });
  }

  function mockGitRebaseFails() {
    execSync.mockImplementation((cmd) => {
      if (cmd === 'git branch --show-current') return 'feature-branch\n';
      if (cmd.startsWith('git log --oneline main..')) return 'abc123 feat: something\n';
      if (cmd === 'git fetch origin main') return '';
      if (cmd === 'git rebase origin/main') throw new Error('CONFLICT: rebase failed');
      if (cmd === 'git rebase --abort') return '';
      return '';
    });
  }

  // ── basic report fields ──────────────────────────────────────────────────

  test('writes a report with status "completed"', () => {
    mockGitNoCommits();
    const fp = reportSuccess('succ-1', { passed: 5, total: 5, passRate: 1 }, [], []);
    expect(readReport(fp).status).toBe('completed');
  });

  test('returns a filepath that exists on disk', () => {
    mockGitNoCommits();
    const fp = reportSuccess('succ-2', { passed: 5, total: 5, passRate: 1 }, [], []);
    expect(typeof fp).toBe('string');
    expect(fs.existsSync(fp)).toBe(true);
  });

  test('sets taskId correctly', () => {
    mockGitNoCommits();
    const fp = reportSuccess('succ-task', { passed: 1, total: 1, passRate: 1 }, [], []);
    expect(readReport(fp).taskId).toBe('succ-task');
  });

  test('sets testResults from parameter', () => {
    mockGitNoCommits();
    const tr = { passed: 10, total: 12, passRate: 0.833 };
    const fp = reportSuccess('succ-tr', tr, [], []);
    expect(readReport(fp).testResults).toEqual(tr);
  });

  test('sets filesCreated from parameter', () => {
    mockGitNoCommits();
    const fp = reportSuccess('succ-fc', { passed: 1, total: 1, passRate: 1 }, ['new.js'], []);
    expect(readReport(fp).filesCreated).toEqual(['new.js']);
  });

  test('sets filesModified from parameter', () => {
    mockGitNoCommits();
    const fp = reportSuccess('succ-fm', { passed: 1, total: 1, passRate: 1 }, [], ['old.js']);
    expect(readReport(fp).filesModified).toEqual(['old.js']);
  });

  test('spreads extras (prdId, prdFilePath) into the report', () => {
    mockGitNoCommits();
    const extras = { prdId: 'prd-99', prdFilePath: '/docs/prd.md' };
    const fp = reportSuccess('succ-ext', { passed: 1, total: 1, passRate: 1 }, [], [], null, extras);
    const report = readReport(fp);
    expect(report.prdId).toBe('prd-99');
    expect(report.prdFilePath).toBe('/docs/prd.md');
  });

  test('triageOutcome in extras is included in the report', () => {
    mockGitNoCommits();
    const to = { action: 'new_uc', ucName: 'Test', reason: 'needed' };
    const fp = reportSuccess(
      'succ-to', { passed: 1, total: 1, passRate: 1 }, [], [], null, { triageOutcome: to },
    );
    expect(readReport(fp).triageOutcome).toEqual(to);
  });

  // ── git behaviour ────────────────────────────────────────────────────────

  test('warns when no commits exist on branch', () => {
    mockGitNoCommits();
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    reportSuccess('succ-warn', { passed: 1, total: 1, passRate: 1 }, [], []);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('No commits on branch'));
    spy.mockRestore();
  });

  test('still writes the report when no commits exist on branch', () => {
    mockGitNoCommits();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const fp = reportSuccess('succ-nocommit', { passed: 1, total: 1, passRate: 1 }, [], []);
    expect(fs.existsSync(fp)).toBe(true);
    jest.restoreAllMocks();
  });

  test('still writes report when on main branch (main also returns hasCommits=false)', () => {
    mockGitOnMain();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const fp = reportSuccess('succ-main', { passed: 1, total: 1, passRate: 1 }, [], []);
    expect(fs.existsSync(fp)).toBe(true);
    expect(readReport(fp).status).toBe('completed');
    jest.restoreAllMocks();
  });

  test('attempts rebase onto origin/main when commits exist on branch', () => {
    mockGitWithCommitsPushed();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    reportSuccess('succ-rebase', { passed: 1, total: 1, passRate: 1 }, [], []);
    const rebaseCalls = execSync.mock.calls.filter((c) => c[0] === 'git rebase origin/main');
    expect(rebaseCalls.length).toBeGreaterThan(0);
    jest.restoreAllMocks();
  });

  test('warns when rebase fails but still writes the report', () => {
    mockGitRebaseFails();
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    const fp = reportSuccess('succ-rebase-fail', { passed: 1, total: 1, passRate: 1 }, [], []);
    expect(fs.existsSync(fp)).toBe(true);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('Sync with main failed'));
    jest.restoreAllMocks();
  });

  test('still writes the report when git check fails entirely', () => {
    mockGitFails();
    const fp = reportSuccess('succ-gitfail', { passed: 1, total: 1, passRate: 1 }, [], []);
    expect(fs.existsSync(fp)).toBe(true);
  });

  test('auto-pushes when there are unpushed commits', () => {
    mockGitWithCommitsUnpushed();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    reportSuccess('succ-autopush', { passed: 1, total: 1, passRate: 1 }, [], []);
    const pushCalls = execSync.mock.calls.filter(
      (c) => typeof c[0] === 'string' && c[0].includes('git push'),
    );
    expect(pushCalls.length).toBeGreaterThan(0);
    jest.restoreAllMocks();
  });

  test('attempts ff-only pull from main when no commits exist on branch', () => {
    mockGitNoCommits();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    reportSuccess('succ-no-commit-sync', { passed: 1, total: 1, passRate: 1 }, [], []);
    const pullCalls = execSync.mock.calls.filter((c) => c[0] === 'git pull --ff-only origin main');
    expect(pullCalls.length).toBeGreaterThan(0);
    jest.restoreAllMocks();
  });
});
