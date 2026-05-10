#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const prWorktree = '/tmp/leadflow-pr1553';
const targetFile = path.join(prWorktree, 'tests/da237aa5-needs-merge-rebase-verification.test.js');

assert.ok(fs.existsSync(targetFile), `Missing PR file: ${targetFile}`);
const src = fs.readFileSync(targetFile, 'utf8');

// Ensure new fallback branch-resolution structure exists
assert.ok(src.includes('const BRANCH_CANDIDATES = {'), 'Missing BRANCH_CANDIDATES map');
assert.ok(src.includes('function resolveBranch(label, candidates)'), 'Missing resolveBranch helper');
assert.ok(src.includes('git fetch origin --quiet'), 'Expected pre-resolution fetch is missing');

// Ensure all 3 use-cases resolve from candidates instead of stale fixed list
assert.ok(src.includes("resolveBranch('uc-marketing-campaign-launch'"), 'Marketing branch resolution missing');
assert.ok(src.includes("resolveBranch('feat-revenue-funnel-visibility'"), 'Revenue branch resolution missing');
assert.ok(src.includes("resolveBranch('feat-subscription-funnel-tracking'"), 'Subscription branch resolution missing');

// Ensure old static list path removed
assert.ok(!src.includes("const BRANCHES = [\n  'dev/b883cbeb-improve-uc-no-tasks-uc-marketing-campaig'"), 'Old fixed BRANCHES list still present');

console.log('PASS: PR #1553 branch resolution logic is present and wired for all three target UCs.');
