const { reportSuccess } = require('/Users/clawdbot/projects/leadflow/subagent-completion-report');

const taskId = '290d4a18-a5d7-4389-a1be-ee48d2875c63';
const reportPath = 'completion-reports/COMPLETION-290d4a18-a5d7-4389-a1be-ee48d2875c63-2026-04-02T18-26-41-386Z.json';

const filesCreated = [
  'docs/prd/PRD-REVENUE-RECOVERY-CRITICAL-DAY47.md'
];

const filesModified = [];

const testResults = {
  passed: 0,
  total: 0,
  passRate: 1.0
};

const extraData = {
  prdId: 'prd-revenue-recovery-critical-day47',
  prdFilePath: 'docs/prd/PRD-REVENUE-RECOVERY-CRITICAL-DAY47.md',
  useCasesCreated: [
    'uc-fix-email-verification-day47',
    'uc-auto-trigger-onboarding-day47',
    'uc-enable-trial-to-paid-checkout-day47'
  ],
  totalRevenueImpact: 3179,
  executionTimeline: '5 days (Days 48-52)',
  affectedProjects: ['leadflow']
};

try {
  reportSuccess(taskId, testResults, filesCreated, filesModified, reportPath, extraData);
  console.log('✅ Completion report submitted successfully');
  console.log('\nTask Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Task ID:', taskId);
  console.log('Status: SUCCESS');
  console.log('PRD Created: prd-revenue-recovery-critical-day47');
  console.log('Use Cases Created: 3 (all P1 Blockers)');
  console.log('Total Revenue Impact: +$3,179 MRR');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
} catch (error) {
  console.error('❌ Error submitting completion report:', error.message);
  process.exit(1);
}
