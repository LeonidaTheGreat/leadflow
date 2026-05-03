'use strict'

/**
 * Static analysis: no production code inserts tokens without hashing.
 *
 * The genome code review scanner flagged the pattern:
 *   /\.insert\([^)]*token[^)]*\)(?!.*hash)/gi → "Token possibly stored without hashing"
 *
 * This test confirms that pattern does not appear in production paths (routes/, lib/,
 * server.js). The only known match is in scripts/smoke-test-email-verification.js
 * which is a diagnostic script, not a production code path.
 */

const fs = require('fs')
const path = require('path')

const TOKEN_INSERT_PATTERN = /\.insert\([^)]*token[^)]*\)/gi

const PRODUCTION_DIRS = [
  path.join(__dirname, '../../routes'),
  path.join(__dirname, '../../lib'),
  path.join(__dirname, '../../server.js'),
]

function scanDir(target, findings) {
  if (!fs.existsSync(target)) return
  const stat = fs.statSync(target)
  if (stat.isFile() && target.endsWith('.js')) {
    const src = fs.readFileSync(target, 'utf-8')
    const lines = src.split('\n')
    lines.forEach((line, idx) => {
      TOKEN_INSERT_PATTERN.lastIndex = 0
      if (TOKEN_INSERT_PATTERN.test(line)) {
        findings.push({ file: target, line: idx + 1, content: line.trim() })
      }
    })
  } else if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(target)) {
      if (!entry.includes('node_modules') && !entry.startsWith('.')) {
        scanDir(path.join(target, entry), findings)
      }
    }
  }
}

describe('Token hashing static analysis', () => {
  test('no production route or lib file inserts tokens in plaintext', () => {
    const findings = []
    for (const dir of PRODUCTION_DIRS) {
      scanDir(dir, findings)
    }

    if (findings.length > 0) {
      const report = findings
        .map(f => `  ${f.file}:${f.line} → ${f.content}`)
        .join('\n')
      throw new Error(
        `Found ${findings.length} potential plaintext token insertion(s) in production code:\n${report}\n` +
        'Use crypto.randomBytes() for token generation and hash before storing if the token needs to be verified.'
      )
    }

    expect(findings).toHaveLength(0)
  })

  test('lib/middleware/require-api-key.js uses timing-safe comparison', () => {
    const middlewarePath = path.join(__dirname, '../../lib/middleware/require-api-key.js')
    expect(fs.existsSync(middlewarePath)).toBe(true)
    const src = fs.readFileSync(middlewarePath, 'utf-8')
    expect(src).toMatch(/timingSafeEqual/)
    expect(src).toMatch(/crypto/)
  })
})
