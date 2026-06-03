#!/usr/bin/env node
/**
 * generate-services-docs.js — Auto-generate SERVICES.md from lib/services/
 *
 * Scans all JS files in lib/services/, extracts class names, public methods,
 * constructor dependencies, and JSDoc descriptions.
 *
 * Called every heartbeat by ~/projects/genome/scripts/generate-services-docs.js.
 * Can also be run standalone: node scripts/generate-services-docs.js
 */

'use strict'

const fs = require('fs')
const path = require('path')

const PROJECT_DIR = path.join(__dirname, '..')
const SERVICES_DIR = path.join(PROJECT_DIR, 'lib', 'services')
const OUTPUT_FILE = path.join(PROJECT_DIR, 'SERVICES.md')
const HEADER = '<!-- AUTO-GENERATED — DO NOT EDIT. Regenerated every heartbeat from lib/services/. -->'

function extractJsdocDescription(jsdoc) {
  if (!jsdoc) return ''
  const lines = jsdoc.split('\n').map(l => l.replace(/^\s*\*\s?/, '').trim()).filter(Boolean)
  for (const line of lines) {
    if (!line.startsWith('@')) return line
  }
  return ''
}

function extractConstructorDeps(src, classStart) {
  const window = src.slice(classStart, classStart + 3000)
  const ctorMatch = window.match(/constructor\s*\(([^)]*)\)/)
  if (!ctorMatch) return []
  return ctorMatch[1].split(',').map(p => p.trim().replace(/\s*=.*$/, '').trim()).filter(Boolean)
}

function extractPublicMethods(src, classStart) {
  const methods = []
  const window = src.slice(classStart, classStart + 20000)
  const methodRegex = /(?:\/\*\*([\s\S]*?)\*\/\s*)?(?:async\s+)?(\w+)\s*\(([^)]*)\)\s*\{/g
  let m
  while ((m = methodRegex.exec(window)) !== null) {
    const jsdoc = m[1] || ''
    const name = m[2]
    const params = m[3].split(',').map(p => p.trim().replace(/\s*=.*$/, '').trim()).filter(Boolean)
    if (name === 'constructor' || name.startsWith('_') || name === 'if' || name === 'for' || name === 'while' || name === 'switch') continue
    if (/^(function|class|const|let|var|return|throw|catch|try)$/.test(name)) continue
    const desc = extractJsdocDescription(jsdoc)
    methods.push({ name, params, description: desc })
  }
  const seen = new Set()
  return methods.filter(m => { if (seen.has(m.name)) return false; seen.add(m.name); return true })
}

function extractExportedFunctions(src) {
  const methods = []
  const exportRegex = /(?:module\.exports\s*=\s*\{([^}]+)\})|(?:exports\.(\w+)\s*=)/g
  let m
  while ((m = exportRegex.exec(src)) !== null) {
    if (m[1]) {
      const names = m[1].split(',').map(n => n.trim().split(/\s+/).pop().trim()).filter(n => n && /^\w+$/.test(n))
      for (const name of names) methods.push({ name, params: [], description: '' })
    } else if (m[2]) {
      methods.push({ name: m[2], params: [], description: '' })
    }
  }
  const seen = new Set()
  return methods.filter(m => { if (seen.has(m.name)) return false; seen.add(m.name); return true })
}

function extractRequireDeps(src) {
  const deps = []
  const reqRegex = /require\(['"]([^'"]+)['"]\)/g
  let m
  while ((m = reqRegex.exec(src)) !== null) {
    const mod = m[1]
    if (mod.startsWith('.')) deps.push(path.basename(mod, '.js'))
    else if (!mod.startsWith('@') || mod.startsWith('@anthropic')) deps.push(mod)
  }
  return [...new Set(deps)]
}

function parseServiceFile(src, filename) {
  const results = []
  const classRegex = /(?:\/\*\*([\s\S]*?)\*\/\s*)?(?:^|[=(,\s])class\s+([A-Z]\w+)/gm
  let classMatch
  while ((classMatch = classRegex.exec(src)) !== null) {
    const jsdoc = classMatch[1] || ''
    const className = classMatch[2]
    const description = extractJsdocDescription(jsdoc)
    const dependencies = extractConstructorDeps(src, classMatch.index)
    const methods = extractPublicMethods(src, classMatch.index)
    results.push({ className, description, dependencies, methods, filename })
  }
  if (results.length === 0) {
    const exportedFunctions = extractExportedFunctions(src)
    if (exportedFunctions.length > 0) {
      const baseName = path.basename(filename, '.js')
      results.push({ className: baseName, description: 'Module with exported functions (no class)', dependencies: [], methods: exportedFunctions, filename })
    }
  }
  return results
}

async function generateServicesDocs() {
  if (!fs.existsSync(SERVICES_DIR)) {
    console.log('   ⚠️ lib/services/ not found — skipping SERVICES.md generation')
    return
  }

  const files = fs.readdirSync(SERVICES_DIR).filter(f => f.endsWith('.js')).sort()
  const allServices = []

  for (const file of files) {
    const src = fs.readFileSync(path.join(SERVICES_DIR, file), 'utf8')
    const parsed = parseServiceFile(src, file)
    const topLevelDeps = extractRequireDeps(src)
    for (const svc of parsed) allServices.push({ ...svc, topLevelDeps })
  }

  let md = `${HEADER}\n`
  md += `# Services Reference\n\n`
  md += `> Generated: ${new Date().toISOString()} | Source: \`lib/services/\`\n\n`
  md += `**${allServices.length} service${allServices.length !== 1 ? 's' : ''} across ${files.length} file${files.length !== 1 ? 's' : ''}**\n\n`

  md += `| Service | File | Methods | Dependencies |\n`
  md += `|---------|------|---------|-------------|\n`
  for (const svc of allServices) {
    const deps = svc.topLevelDeps.slice(0, 4).join(', ') + (svc.topLevelDeps.length > 4 ? '…' : '')
    md += `| [${svc.className}](#${svc.className.toLowerCase()}) | \`${svc.filename}\` | ${svc.methods.length} | ${deps || '-'} |\n`
  }

  for (const svc of allServices) {
    md += `\n---\n\n`
    md += `## ${svc.className}\n\n`
    if (svc.description) md += `${svc.description}\n\n`
    md += `**File:** \`lib/services/${svc.filename}\`\n\n`
    if (svc.topLevelDeps.length > 0) md += `**Dependencies:** ${svc.topLevelDeps.map(d => `\`${d}\``).join(', ')}\n\n`
    if (svc.dependencies.length > 0) md += `**Constructor params:** ${svc.dependencies.map(d => `\`${d}\``).join(', ')}\n\n`
    if (svc.methods.length > 0) {
      md += `### Methods\n\n`
      md += `| Method | Params | Description |\n`
      md += `|--------|--------|-------------|\n`
      for (const m of svc.methods) {
        const params = m.params.length > 0 ? m.params.map(p => `\`${p}\``).join(', ') : '-'
        md += `| \`${m.name}()\` | ${params} | ${m.description || '-'} |\n`
      }
    } else {
      md += `*No public methods detected.*\n`
    }
  }

  fs.writeFileSync(OUTPUT_FILE, md, 'utf8')
  console.log(`   ✅ SERVICES.md generated (${allServices.length} services, ${files.length} files)`)
}

if (require.main === module) {
  generateServicesDocs().catch(err => { console.error('generateServicesDocs failed:', err.message); process.exit(1) })
}

module.exports = { generateServicesDocs }
