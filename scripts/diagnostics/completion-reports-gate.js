'use strict';

/*
Task Spec (Task ID: 452b83c3-05f7-4f91-a827-4d7bc0b34065)
What:
- Add PROJECT_ROOT/scripts/diagnostics/completion-reports-gate.js
  to enforce the completion report quality gate by checking report counts and rotating
  old completion JSON files from completion-reports/ into .completion-reports-archive/.
- Update PROJECT_ROOT/package.json scripts with "completion_reports"
  to run this gate directly.

Verify:
- Run: npm run completion_reports
  Expected: exits 0 and prints counts at or below gate max.
- Run: find completion-reports -maxdepth 1 -type f -name 'COMPLETION-*' | wc -l
  Expected: <= 500.
- Run: npm run build && npm run lint && npm test && npm audit --audit-level=high
  Expected: all exit 0.

Boundaries:
- Do not change service, route, or database logic.
- Do not modify files in /Users/clawdbot/.openclaw/genome/.
- Do not rewrite historical report contents; only move old completion report files to archive.
*/

const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..', '..');
const completionDir = path.join(projectDir, 'completion-reports');
const archiveDir = path.join(projectDir, '.completion-reports-archive');
const docsReportsDir = path.join(projectDir, 'docs', 'reports');

const MAX_COUNT = 500;
const TARGET_COUNT = 450;

function listCompletionFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => name.startsWith('COMPLETION-'))
    .map((name) => {
      const fullPath = path.join(dir, name);
      const stat = fs.statSync(fullPath);
      return { name, fullPath, mtimeMs: stat.mtimeMs };
    })
    .sort((a, b) => a.mtimeMs - b.mtimeMs);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function moveWithUniqueName(fromPath, toDir, name) {
  let targetPath = path.join(toDir, name);
  if (!fs.existsSync(targetPath)) {
    fs.renameSync(fromPath, targetPath);
    return;
  }

  const parsed = path.parse(name);
  let suffix = 1;
  while (true) {
    const candidate = `${parsed.name}.${suffix}${parsed.ext}`;
    targetPath = path.join(toDir, candidate);
    if (!fs.existsSync(targetPath)) {
      fs.renameSync(fromPath, targetPath);
      return;
    }
    suffix += 1;
  }
}

function rotateCompletionReports() {
  const files = listCompletionFiles(completionDir);
  if (files.length <= MAX_COUNT) return { moved: 0, before: files.length, after: files.length };

  ensureDir(archiveDir);
  const moveCount = Math.max(0, files.length - TARGET_COUNT);
  const toMove = files.slice(0, moveCount);

  for (const file of toMove) {
    moveWithUniqueName(file.fullPath, archiveDir, file.name);
  }

  const remaining = listCompletionFiles(completionDir).length;
  return { moved: moveCount, before: files.length, after: remaining };
}

function main() {
  const rotation = rotateCompletionReports();
  const completionCount = listCompletionFiles(completionDir).length;
  const docsReportsCount = listCompletionFiles(docsReportsDir).length;

  if (rotation.moved > 0) {
    console.log(`[completion_reports] Rotated ${rotation.moved} file(s) from completion-reports to .completion-reports-archive (${rotation.before} -> ${rotation.after})`);
  }

  console.log(`[completion_reports] completion-reports count: ${completionCount} (max ${MAX_COUNT})`);
  console.log(`[completion_reports] docs/reports count: ${docsReportsCount} (max ${MAX_COUNT})`);

  if (completionCount > MAX_COUNT) {
    console.error(`[completion_reports] FAIL: ${completionCount} completion reports (max ${MAX_COUNT})`);
    process.exit(1);
  }

  if (docsReportsCount > MAX_COUNT) {
    console.error(`[completion_reports] FAIL: ${docsReportsCount} completion reports in docs/reports (max ${MAX_COUNT})`);
    process.exit(1);
  }

  console.log('[completion_reports] PASS');
}

main();
