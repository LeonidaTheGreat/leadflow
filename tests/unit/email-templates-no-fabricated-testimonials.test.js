'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`  ❌ ${name}: ${error.message}`);
    failed++;
  }
}

const TEMPLATES_DIR = path.join(__dirname, '../../email-sequence/templates');

// Fabricated testimonials that were removed — must never return.
// These names/figures had no real customer records when they were removed.
const FABRICATED_PATTERNS = [
  { pattern: /Michael R\./i, description: 'fabricated agent name "Michael R."' },
  { pattern: /890K/i, description: 'fabricated deal size "$890K"' },
  { pattern: /2\.1M/i, description: 'fabricated deal size "$2.1M"' },
  { pattern: /Compass.*San Diego/i, description: 'fabricated brokerage reference "Compass, San Diego"' },
];

function run() {
  console.log('\n=== unit: email templates — no fabricated testimonials ===\n');

  const templates = fs.readdirSync(TEMPLATES_DIR).filter(f => f.endsWith('.html') || f.endsWith('.txt'));

  assert.ok(templates.length > 0, 'expected at least one template file');

  for (const file of templates) {
    const content = fs.readFileSync(path.join(TEMPLATES_DIR, file), 'utf8');

    for (const { pattern, description } of FABRICATED_PATTERNS) {
      check(`${file}: no ${description}`, () => {
        const match = content.match(pattern);
        assert.ok(!match, `Found fabricated testimonial in ${file}: matched "${match && match[0]}"`);
      });
    }
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

run();
