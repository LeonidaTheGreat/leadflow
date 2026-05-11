'use strict';

const fs = require('fs');
const path = require('path');

const TEMPLATES_DIR = path.resolve(__dirname, '../../email-sequence/templates');

// Strings that must never appear in email templates — they reference
// fabricated customers/deals that do not exist (0 paying customers as of pilot).
const FORBIDDEN_PATTERNS = [
  { pattern: /Michael R\./i, description: 'fabricated customer name "Michael R."' },
  { pattern: /890K/i, description: 'fabricated deal value "$890K"' },
  { pattern: /2\.1M/i, description: 'fabricated recovery amount "$2.1M"' },
  { pattern: /Compass.*San Diego|San Diego.*Compass/i, description: 'fabricated brokerage reference' },
];

function readTemplateFiles() {
  return fs.readdirSync(TEMPLATES_DIR)
    .filter(f => f.endsWith('.html'))
    .map(f => ({
      name: f,
      content: fs.readFileSync(path.join(TEMPLATES_DIR, f), 'utf8'),
    }));
}

describe('Email templates — no fabricated testimonials', () => {
  let templates;

  beforeAll(() => {
    templates = readTemplateFiles();
  });

  test('email-sequence/templates/ directory exists and has html files', () => {
    expect(templates.length).toBeGreaterThan(0);
  });

  FORBIDDEN_PATTERNS.forEach(({ pattern, description }) => {
    test(`no template contains ${description}`, () => {
      const violations = templates.filter(t => pattern.test(t.content));
      if (violations.length > 0) {
        const names = violations.map(t => t.name).join(', ');
        throw new Error(`Found ${description} in: ${names}`);
      }
      expect(violations).toHaveLength(0);
    });
  });
});
