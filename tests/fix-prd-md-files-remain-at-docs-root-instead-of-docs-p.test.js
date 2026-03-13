const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const docsRoot = path.join(repoRoot, 'docs');
const prdDir = path.join(docsRoot, 'prd');

function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isFile()).map((d) => d.name);
}

function main() {
  assert(fs.existsSync(docsRoot), 'docs/ directory is missing');
  assert(fs.existsSync(prdDir), 'docs/prd/ directory is missing');

  const rootPrdFiles = listFiles(docsRoot).filter((name) => /^PRD-.*\.md$/i.test(name));
  assert.deepStrictEqual(
    rootPrdFiles,
    [],
    `Expected no PRD-*.md files in docs/ root, found: ${rootPrdFiles.join(', ')}`,
  );

  const nestedPrdFiles = listFiles(prdDir).filter((name) => /^PRD-.*\.md$/i.test(name));
  assert(nestedPrdFiles.length > 0, 'Expected PRD files to exist under docs/prd/');

  const forgotPasswordTaskScript = fs.readFileSync(
    path.join(repoRoot, 'scripts', 'create-forgot-password-task.js'),
    'utf8',
  );
  assert(
    forgotPasswordTaskScript.includes('docs/prd/PRD-FORGOT-PASSWORD.md'),
    'Expected forgot-password task script to reference docs/prd/PRD-FORGOT-PASSWORD.md',
  );

  console.log(`PASS: ${nestedPrdFiles.length} PRD files under docs/prd/, none under docs/, references updated.`);
}

main();
