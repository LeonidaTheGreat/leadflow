'use strict'
/*
TASK SPEC (52d64bb5-d9f8-4a86-8ae2-d65ca8f0b926)
What:
- Change /subagent-completion-report.js:
  - checkGitCommits()
  - add ensureBranchSyncedWithMain()
  - update reportSuccess() sync flow to enforce main-sync invariant even when branch has zero local commits
- Change /tests/unit/subagent-completion-report.test.js:
  - update git mocks for new sync commands
  - add assertions for no-commit sync path

Verify:
- npm test -- tests/unit/subagent-completion-report.test.js
- npm test
- npm run build
- rg -n "ensureBranchSyncedWithMain|git pull --ff-only origin main|git rebase origin/main" subagent-completion-report.js tests/unit/subagent-completion-report.test.js

Boundaries:
- Do not modify routes/, lib/services/, product dashboard code, DB schema/migrations, or orchestration playbooks.
- Do not change task-store/project-config-loader behavior.
- Keep report JSON schema and exported function signatures intact.
*/
/**
 * subagent-completion-report.js
 * Standard completion report format for subagents
 * 
 * Usage: At end of subagent session, call:
 *   const { writeCompletionReport } = require('./subagent-completion-report');
 *   await writeCompletionReport({ taskId, status, testResults, ... });
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { getConfig, getProjectDir, getConfigForProject } = require('./project-config-loader');

// Resolve completion-reports dir for a given project. Falls back to default.
function getCompletionDir(projectId) {
  let dir
  if (projectId) {
    const cfg = getConfigForProject(projectId)
    if (cfg?.project_dir) dir = path.join(cfg.project_dir, 'completion-reports')
  }
  if (!dir) dir = path.join(getProjectDir(), 'completion-reports')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

/**
 * Write a standardized completion report
 * @param {Object} report - The completion report
 * @param {string} report.taskId - Task identifier
 * @param {string} report.status - 'completed' | 'failed' | 'partial'
 * @param {Object} report.testResults - Test execution results
 * @param {number} report.testResults.passed - Number of tests passed
 * @param {number} report.testResults.total - Total number of tests
 * @param {number} report.testResults.passRate - Percentage (0-1)
 * @param {string[]} report.filesCreated - List of files created
 * @param {string[]} report.filesModified - List of files modified
 * @param {string} report.completionReportPath - Path to detailed report
 * @param {string} [report.error] - Error message if failed
 * @param {string} [report.retryRecommendation] - 'retry', 'decompose', 'escalate'
 * @param {string} [report.prdId] - PRD identifier if a PRD was created/updated (PM agents)
 * @param {string} [report.prdFilePath] - Path to the PRD file (PM agents)
 * @param {string[]} [report.affectedProjects] - Project IDs that need follow-up work (PM agents, for cross-project fan-out)
 * @param {Object} [report.triageOutcome] - PM triage result (required for triage tasks)
 * @param {string} [report.triageOutcome.action] - 'existing_uc' | 'new_uc' | 'duplicate' | 'no_action_needed'
 * @param {string} [report.triageOutcome.ucId] - UC id (existing or newly created)
 * @param {string} [report.triageOutcome.ucName] - UC name (for new UCs)
 * @param {string} [report.triageOutcome.description] - UC description (for new UCs)
 * @param {string[]} [report.triageOutcome.workflow] - Workflow steps e.g. ['dev','qc'] (for new UCs)
 * @param {string} [report.triageOutcome.reason] - Why this action was chosen
 * @param {Object[]} [report.architecturalDecisions] - Structural choices made during this task
 * @param {string} report.architecturalDecisions[].decision - What was decided (e.g. "Created FooService class")
 * @param {string} report.architecturalDecisions[].reason - Why (e.g. "Existing BarService was too large, SRP violation")
 * @param {string} report.architecturalDecisions[].alternatives - What else was considered (e.g. "Could have extended BarService")
 */
function writeCompletionReport(report) {
  const timestamp = new Date().toISOString();
  const filename = `COMPLETION-${report.taskId}-${Date.now()}.json`;
  const completionDir = getCompletionDir(report.projectId)
  const filepath = path.join(completionDir, filename);

  const fullReport = {
    version: '1.0',
    timestamp,
    taskId: report.taskId,
    status: report.status,
    testResults: report.testResults || { passed: 0, total: 0, passRate: 0 },
    filesCreated: report.filesCreated || [],
    filesModified: report.filesModified || [],
    completionReportPath: report.completionReportPath,
    error: report.error || null,
    retryRecommendation: report.retryRecommendation || null,
    prdId: report.prdId || null,
    prdFilePath: report.prdFilePath || null,
    affectedProjects: report.affectedProjects || null,
    triageOutcome: report.triageOutcome || null,
    // Architectural discoveries: gotchas, patterns, constraints found during this task.
    // Array of { category: 'gotcha'|'pattern'|'constraint', summary: string }
    // Extracted by the genome and appended to DISCOVERIES.md (append-only, never overwritten).
    discoveries: Array.isArray(report.discoveries) ? report.discoveries : [],
    rootCauseAnalysis: report.rootCauseAnalysis || null,
    // Architectural Decision Records: structural choices made during this task.
    // Array of { decision: string, reason: string, alternatives: string }
    // Fed into cross-agent memory so nearby future work knows WHY patterns were chosen.
    architecturalDecisions: Array.isArray(report.architecturalDecisions) ? report.architecturalDecisions : [],
    metadata: {
      processed: false,
      processedAt: null,
      processedBy: null
    }
  };
  
  fs.writeFileSync(filepath, JSON.stringify(fullReport, null, 2));
  console.log(`[CompletionReport] Written: ${filepath}`);
  
  return filepath;
}

/**
 * Mark a completion report as processed
 * @param {string} filepath - Path to the completion report
 * @param {string} processor - Who processed it (e.g., 'orchestrator-heartbeat')
 */
function markReportProcessed(filepath, processor) {
  const report = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  if (!report.metadata) report.metadata = {};
  report.metadata.processed = true;
  report.metadata.processedAt = new Date().toISOString();
  report.metadata.processedBy = processor;
  fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
}

/**
 * Get all unprocessed completion reports
 * @returns {Array} List of unprocessed reports with their filepaths
 */
function getUnprocessedReports(projectId) {
  const completionDir = getCompletionDir(projectId)
  if (!fs.existsSync(completionDir)) {
    return [];
  }

  const files = fs.readdirSync(completionDir);
  const reports = [];

  for (const file of files) {
    if (!file.startsWith('COMPLETION-') || !file.endsWith('.json')) {
      continue;
    }

    const filepath = path.join(completionDir, file);
    try {
      const report = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
      if (!report.metadata?.processed) {
        reports.push({ ...report, _filepath: filepath });
      }
    } catch (e) {
      console.error(`[CompletionReport] Error reading ${file}:`, e.message);
    }
  }
  
  return reports.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

/**
 * Check if the current git branch has commits ahead of main.
 * Returns { hasCommits, branch, commitCount } or null if git check fails.
 */
function checkGitCommits() {
  try {
    const projectDir = getProjectDir()
    const branch = execSync('git branch --show-current', {
      cwd: projectDir, encoding: 'utf-8', timeout: 5000
    }).trim()
    if (!branch || branch === 'main' || branch === 'master') {
      return { hasCommits: false, branch, commitCount: 0 }
    }
    const commits = execSync(`git log --oneline main..${branch} 2>/dev/null`, {
      cwd: projectDir, encoding: 'utf-8', timeout: 5000
    }).trim()
    return { hasCommits: !!commits, branch, commitCount: commits ? commits.split('\n').length : 0 }
  } catch { // git branch/log check failed — don't block completion
    return null
  }
}

function ensureBranchSyncedWithMain(gitCheck) {
  if (!gitCheck?.branch || gitCheck.branch === 'main' || gitCheck.branch === 'master') return
  const projectDir = getProjectDir()
  execSync('git fetch origin main', { cwd: projectDir, stdio: 'pipe', timeout: 15000 })

  // Branches with no local commits require ff-only pull to advance to main.
  if (!gitCheck.hasCommits) {
    execSync('git pull --ff-only origin main', { cwd: projectDir, stdio: 'pipe', timeout: 30000 })
    console.log('[CompletionReport] ✅ Fast-forward synced branch to latest main')
    return
  }

  execSync('git rebase origin/main', { cwd: projectDir, stdio: 'pipe', timeout: 30000 })
  console.log('[CompletionReport] ✅ Rebased onto latest main')
}

/**
 * Quick helper for successful completions.
 * For dev/design agents: warns if no commits found on branch (likely phantom work).
 * @param {Object} [extras] - Optional extra fields (prdId, prdFilePath)
 */
function reportSuccess(taskId, testResults, filesCreated, filesModified, completionReportPath, extras) {
  // Pre-flight: check if code was actually committed
  const gitCheck = checkGitCommits()
  if (gitCheck && !gitCheck.hasCommits) {
    console.warn(`[CompletionReport] ⚠️ WARNING: No commits on branch "${gitCheck.branch}" — reporting success without code changes. Did you forget to commit and push?`)
    // Still write the report but flag it — verification will catch this
  }
  if (gitCheck?.branch && gitCheck.branch !== 'main' && gitCheck.branch !== 'master') {
    try {
      ensureBranchSyncedWithMain(gitCheck)
    } catch (syncErr) {
      // Only abort rebase path; ff-only pull path has no rebase state to abort.
      if (gitCheck.hasCommits) {
        try { execSync('git rebase --abort', { cwd: getProjectDir(), stdio: 'pipe' }) } catch { /* intentionally swallowed: non-fatal best-effort */ } // may already be clean
      }
      console.warn(`[CompletionReport] ⚠️ Sync with main failed: ${syncErr.message?.slice(0, 80)}. Branch may be behind main.`)
    }
  }

  if (gitCheck?.hasCommits) {
    // Check if pushed, auto-push if not
    try {
      const projectDir = getProjectDir()
      const unpushed = execSync(`git log --oneline origin/${gitCheck.branch}..${gitCheck.branch} 2>/dev/null`, {
        cwd: projectDir, encoding: 'utf-8', timeout: 5000
      }).trim()
      if (unpushed) {
        console.warn(`[CompletionReport] ⚠️ WARNING: ${unpushed.split('\n').length} unpushed commit(s) on "${gitCheck.branch}". Running git push...`)
        try {
          execSync(`git push -u origin ${gitCheck.branch} --force-with-lease`, { cwd: projectDir, stdio: 'pipe', timeout: 30000 })
          console.log(`[CompletionReport] ✅ Auto-pushed to origin/${gitCheck.branch}`)
        } catch (pushErr) {
          console.warn(`[CompletionReport] ❌ Auto-push failed: ${pushErr.message?.slice(0, 100)}`)
        }
      }
    } catch { /* intentionally swallowed: non-fatal best-effort */ } // push check non-fatal
  }

  return writeCompletionReport({
    taskId,
    status: 'completed',
    testResults,
    filesCreated,
    filesModified,
    completionReportPath,
    ...extras
  });
}

/**
 * Quick helper for failures
 */
function reportFailure(taskId, error, testResults, retryRecommendation) {
  return writeCompletionReport({
    taskId,
    status: 'failed',
    error,
    testResults: testResults || { passed: 0, total: 0, passRate: 0 },
    retryRecommendation,
    filesCreated: [],
    filesModified: [],
    completionReportPath: null
  });
}

module.exports = {
  writeCompletionReport,
  markReportProcessed,
  getUnprocessedReports,
  reportSuccess,
  reportFailure,
  getCompletionDir
};
