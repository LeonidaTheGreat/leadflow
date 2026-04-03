const { reportSuccess } = require('/Users/clawdbot/projects/leadflow/subagent-completion-report');

const taskId = '390e5236-f672-46a1-9d2f-41fcde27a1a7';
const filesCreated = [
  // No new files, replaced existing
];
const filesModified = [
  'product/lead-response/dashboard/app/page.tsx',
  'product/lead-response/dashboard/app/layout.tsx'
];

const testResults = {
  passed: 1,
  total: 1,
  passRate: 1.0
};

reportSuccess(
  taskId,
  testResults,
  filesCreated,
  filesModified,
  null
);

console.log('✅ Completion report submitted for UC-LANDING-MARKETING-001');
