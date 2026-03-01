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

const COMPLETION_DIR = '/Users/clawdbot/.openclaw/workspace/projects/leadflow/completion-reports';

// Ensure directory exists
if (!fs.existsSync(COMPLETION_DIR)) {
  fs.mkdirSync(COMPLETION_DIR, { recursive: true });
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
 */
function writeCompletionReport(report) {
  const timestamp = new Date().toISOString();
  const filename = `COMPLETION-${report.taskId}-${Date.now()}.json`;
  const filepath = path.join(COMPLETION_DIR, filename);
  
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
  report.metadata.processed = true;
  report.metadata.processedAt = new Date().toISOString();
  report.metadata.processedBy = processor;
  fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
}

/**
 * Get all unprocessed completion reports
 * @returns {Array} List of unprocessed reports with their filepaths
 */
function getUnprocessedReports() {
  if (!fs.existsSync(COMPLETION_DIR)) {
    return [];
  }
  
  const files = fs.readdirSync(COMPLETION_DIR);
  const reports = [];
  
  for (const file of files) {
    if (!file.startsWith('COMPLETION-') || !file.endsWith('.json')) {
      continue;
    }
    
    const filepath = path.join(COMPLETION_DIR, file);
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
 * Quick helper for successful completions
 */
function reportSuccess(taskId, testResults, filesCreated, filesModified, completionReportPath) {
  return writeCompletionReport({
    taskId,
    status: 'completed',
    testResults,
    filesCreated,
    filesModified,
    completionReportPath
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
  COMPLETION_DIR
};