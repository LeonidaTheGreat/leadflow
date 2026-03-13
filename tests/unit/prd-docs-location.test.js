const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const docsRoot = path.join(repoRoot, 'docs');
const prdDir = path.join(docsRoot, 'prd');

function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isFile()).map((d) => d.name);
}

function main() {
  const rootPrdFiles = listFiles(docsRoot).filter((name) => /^PRD-.*\.md$/i.test(name));
  assert.deepStrictEqual(
    rootPrdFiles,
    [],
    `Expected no PRD-*.md files in docs/ root, found: ${rootPrdFiles.join(', ')}`,
  );

  const nestedPrdFiles = listFiles(prdDir).filter((name) => /^PRD-.*\.md$/i.test(name));
  assert(
    nestedPrdFiles.length > 0,
    'Expected PRD files to exist in docs/prd/, but none were found.',
  );

  console.log(`PASS: ${nestedPrdFiles.length} PRD files found in docs/prd/ and none in docs/ root.`);
}

main();
