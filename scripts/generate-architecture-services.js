#!/usr/bin/env node
/**
 * generate-architecture-services.js — Auto-regenerate the services table
 * in ARCHITECTURE.md from the actual lib/services/ directory.
 *
 * Two-layer approach: only replaces content between AUTO-GENERATED markers.
 * All other sections (architecture decisions, rules, patterns) are preserved.
 *
 * Called every heartbeat by the genome. Can also run standalone:
 *   node scripts/generate-architecture-services.js
 */

const fs = require('fs')
const path = require('path')

const PROJECT_DIR = path.join(__dirname, '..')
const ARCH_PATH = path.join(PROJECT_DIR, 'ARCHITECTURE.md')
const SERVICES_DIR = path.join(PROJECT_DIR, 'lib', 'services')

const START_MARKER = '<!-- AUTO-GENERATED from lib/services/'
const END_MARKER = '<!-- /AUTO-GENERATED services -->'

/**
 * Extract a one-line description from a service file.
 * Looks for: JSDoc @description, first line of top comment, or class JSDoc.
 */
function extractDescription(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    // Try JSDoc on the class
    const classDoc = content.match(/\/\*\*\s*\n\s*\*\s*(.+?)(?:\n|\*\/)/m)
    if (classDoc) return classDoc[1].replace(/\*\s*$/, '').trim()
    // Try first comment block
    const firstComment = content.match(/\/\*\*?([\s\S]*?)\*\//)
    if (firstComment) {
      const lines = firstComment[1].split('\n')
        .map(l => l.replace(/^\s*\*?\s*/, '').trim())
        .filter(l => l && !l.startsWith('@') && !l.startsWith('#'))
      if (lines[0]) return lines[0]
    }
    // Try // comment at top
    const lineComment = content.match(/^\/\/\s*(.+)/m)
    if (lineComment) return lineComment[1].trim()
    return '—'
  } catch {
    return '—'
  }
}

/**
 * Detect whether a file exports a class or loose functions.
 */
function detectPattern(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    if (/\bclass\s+\w+/.test(content)) return 'class'
    return 'functions'
  } catch {
    return 'unknown'
  }
}

function generateServicesTable() {
  if (!fs.existsSync(SERVICES_DIR)) return null

  const files = fs.readdirSync(SERVICES_DIR)
    .filter(f => f.endsWith('.js'))
    .sort()

  const rows = [
    // Always include db.js as first entry
    { name: 'DB Client', location: 'lib/db.js', description: 'PostgreSQL connection pool', pattern: 'module' }
  ]

  for (const file of files) {
    const absPath = path.join(SERVICES_DIR, file)
    const name = file.replace('.js', '')
    const description = extractDescription(absPath)
    const pattern = detectPattern(absPath)
    rows.push({
      name,
      location: `lib/services/${file}`,
      description,
      pattern
    })
  }

  let table = `${START_MARKER} — regenerate with: node scripts/generate-architecture-services.js -->\n`
  table += `| Service | Location | Responsibility |\n`
  table += `|---------|----------|---------------|\n`
  for (const row of rows) {
    const patternFlag = row.pattern === 'functions' ? ' ⚠️' : ''
    table += `| ${row.name}${patternFlag} | \`${row.location}\` | ${row.description} |\n`
  }
  table += `${END_MARKER}`

  return { table, serviceCount: rows.length, functionBased: rows.filter(r => r.pattern === 'functions').length }
}

function updateArchitectureMd() {
  if (!fs.existsSync(ARCH_PATH)) {
    console.log('ARCHITECTURE.md not found — skipping')
    return { updated: false }
  }

  const result = generateServicesTable()
  if (!result) {
    console.log('lib/services/ not found — skipping')
    return { updated: false }
  }

  const content = fs.readFileSync(ARCH_PATH, 'utf-8')

  // Find the auto-generated section
  const startIdx = content.indexOf(START_MARKER)
  if (startIdx === -1) {
    console.log('No AUTO-GENERATED marker found in ARCHITECTURE.md — skipping')
    return { updated: false }
  }

  // Find end: either the END_MARKER or the next section marker (> **If you're...)
  let endIdx = content.indexOf(END_MARKER, startIdx)
  if (endIdx !== -1) {
    endIdx += END_MARKER.length
  } else {
    // Legacy: find the blank line after the table followed by the blockquote
    const afterStart = content.indexOf('\n> ', startIdx)
    if (afterStart !== -1) {
      endIdx = afterStart
    } else {
      console.log('Could not find end of auto-generated section — skipping')
      return { updated: false }
    }
  }

  const before = content.slice(0, startIdx)
  const after = content.slice(endIdx)

  const newContent = before + result.table + after
  if (newContent === content) {
    return { updated: false, serviceCount: result.serviceCount }
  }

  fs.writeFileSync(ARCH_PATH, newContent)
  return { updated: true, serviceCount: result.serviceCount, functionBased: result.functionBased }
}

// Allow standalone execution
if (require.main === module) {
  const result = updateArchitectureMd()
  if (result.updated) {
    console.log(`✅ ARCHITECTURE.md updated: ${result.serviceCount} services (${result.functionBased} function-based)`)
  } else {
    console.log(`ℹ️ ARCHITECTURE.md unchanged (${result.serviceCount || 0} services)`)
  }
}

module.exports = { updateArchitectureMd }
