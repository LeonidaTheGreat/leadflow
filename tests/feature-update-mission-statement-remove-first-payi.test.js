// E2E test: UC feature-update-mission-statement-remove-first-payi
// Verifies that outdated mission statement references have been removed/updated
// and updated content is present in CLAUDE.md and PMF.md

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');

let passed = 0;
let failed = 0;

function check(label, fn) {
  try {
    fn();
    console.log(`✅ ${label}`);
    passed++;
  } catch (err) {
    console.log(`❌ ${label}: ${err.message}`);
    failed++;
  }
}

const claudeMd = fs.readFileSync(path.join(ROOT, 'CLAUDE.md'), 'utf8');
const pmfMd = fs.readFileSync(path.join(ROOT, 'PMF.md'), 'utf8');

// CLAUDE.md checks
check('CLAUDE.md: old "Near-term Goal: First paying customer by 2026-07-01" removed', () => {
  assert(!claudeMd.includes('Near-term Goal:'), 'Still contains "Near-term Goal:" label');
});

check('CLAUDE.md: 2026-07-01 deadline still mentioned as archived (not silently dropped)', () => {
  assert(claudeMd.includes('2026-07-01'), 'Missing archived date 2026-07-01');
});

check('CLAUDE.md: phase updated to Revenue Foundation', () => {
  assert(claudeMd.includes('Revenue Foundation'), 'Phase not updated to Revenue Foundation');
});

check('CLAUDE.md: Day 79 of 90 reference removed', () => {
  assert(!claudeMd.includes('Day 79 of 90'), 'Stale "Day 79 of 90" still present');
});

check('CLAUDE.md: $20K MRR goal still present', () => {
  assert(claudeMd.includes('$20K MRR'), 'Primary $20K MRR goal missing');
});

// PMF.md checks
check('PMF.md: "Near-Term Milestone: First paying customer by 2026-07-01" removed', () => {
  assert(!pmfMd.includes('Near-Term Milestone:'), 'Near-Term Milestone header still present');
});

check('PMF.md: archived milestones section exists', () => {
  assert(pmfMd.includes('Archived Milestones') || pmfMd.includes('archived'), 'No archived milestones documentation');
});

check('PMF.md: Day 151 of 180 current status present', () => {
  assert(pmfMd.includes('Day 151 of 180'), 'Current status (Day 151) not updated');
});

check('PMF.md: Last Updated date updated to 2026-07-16', () => {
  assert(pmfMd.includes('2026-07-16'), 'Last Updated date not refreshed');
});

check('PMF.md: $20K MRR by Day 180 goal retained', () => {
  assert(pmfMd.includes('$20,000 MRR') || pmfMd.includes('$20K MRR'), '$20K MRR goal missing');
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
