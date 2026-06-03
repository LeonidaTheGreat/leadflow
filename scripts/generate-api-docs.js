#!/usr/bin/env node
/**
 * generate-api-docs.js — Auto-generate API.md from routes/
 *
 * Scans all JS files in routes/ and integration/, extracts HTTP method,
 * path, brief description, and which service is called.
 *
 * Called every heartbeat by ~/projects/genome/scripts/generate-api-docs.js.
 * Can also be run standalone: node scripts/generate-api-docs.js
 */

'use strict'

const fs = require('fs')
const path = require('path')

const PROJECT_DIR = path.join(__dirname, '..')
const OUTPUT_FILE = path.join(PROJECT_DIR, 'API.md')
const HEADER = '<!-- AUTO-GENERATED — DO NOT EDIT. Regenerated every heartbeat from routes/. -->'

const ROUTE_DIRS = [
  { dir: path.join(PROJECT_DIR, 'routes'), prefix: 'routes' },
  { dir: path.join(PROJECT_DIR, 'integration'), prefix: 'integration' }
]

function parseRouteFile(src, relPath) {
  const routes = []

  const routeRegex = /(?:\/\/[^\n]*\n\s*)*(?:\/\*\*([\s\S]*?)\*\/\s*)?router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi
  let m
  while ((m = routeRegex.exec(src)) !== null) {
    routes.push({
      method: m[2].toUpperCase(),
      path: m[3],
      description: extractDescription(src, m.index, m[1] || ''),
      services: extractServiceCalls(src, m.index),
      auth: detectAuth(src, m.index),
      file: relPath
    })
  }

  const appRouteRegex = /(?:\/\/[^\n]*\n\s*)*(?:\/\*\*([\s\S]*?)\*\/\s*)?app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi
  while ((m = appRouteRegex.exec(src)) !== null) {
    routes.push({
      method: m[2].toUpperCase(),
      path: m[3],
      description: extractDescription(src, m.index, m[1] || ''),
      services: extractServiceCalls(src, m.index),
      auth: detectAuth(src, m.index),
      file: relPath
    })
  }

  return routes
}

function extractDescription(src, routeStart, jsdoc) {
  if (jsdoc) {
    const lines = jsdoc.split('\n').map(l => l.replace(/^\s*\*\s?/, '').trim()).filter(Boolean)
    for (const line of lines) {
      if (!line.startsWith('@') && line.length > 3) return line
    }
  }
  const before = src.slice(Math.max(0, routeStart - 400), routeStart)
  const lines = before.split('\n')
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 6); i--) {
    const line = lines[i].trim()
    if (line.startsWith('//')) {
      const comment = line.replace(/^\/\/+\s*[─—*\s]*/, '').trim()
      if (comment.length > 3 && !/^GET|^POST|^PUT|^DELETE|^PATCH/.test(comment)) return comment
    }
  }
  return ''
}

function extractServiceCalls(src, routeStart) {
  const body = src.slice(routeStart, routeStart + 800)
  const serviceRefs = new Set()
  const serviceCallRegex = /(\w+Service|\w+Handler|\w+Client)\s*\.\s*\w+\s*\(/g
  let m
  while ((m = serviceCallRegex.exec(body)) !== null) serviceRefs.add(m[1])
  const newServiceRegex = /new\s+(\w+Service|\w+Handler|\w+Client)\s*\(/g
  while ((m = newServiceRegex.exec(body)) !== null) serviceRefs.add(m[1])
  return [...serviceRefs]
}

function detectAuth(src, routeStart) {
  const body = src.slice(routeStart, routeStart + 600)
  if (/verifyAdminAuth|LEADFLOW_API_KEY|admin.*auth/i.test(body)) return 'API key (admin)'
  if (/Authorization|bearer|apiKey/i.test(body)) return 'Bearer token'
  if (/session|isAuthenticated|req\.user/i.test(body)) return 'Session'
  if (/cron|vercel-cron/i.test(body)) return 'Vercel cron'
  return 'None'
}

function collectJsFiles(dir) {
  const results = []
  if (!fs.existsSync(dir)) return results
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) results.push(...collectJsFiles(full))
    else if (entry.isFile() && entry.name.endsWith('.js')) results.push(full)
  }
  return results.sort()
}

function scanRoutes() {
  const groups = {}
  for (const { dir } of ROUTE_DIRS) {
    if (!fs.existsSync(dir)) continue
    for (const filePath of collectJsFiles(dir)) {
      const src = fs.readFileSync(filePath, 'utf8')
      const relPath = path.relative(PROJECT_DIR, filePath)
      const routes = parseRouteFile(src, relPath)
      if (routes.length > 0) groups[relPath] = routes
    }
  }
  return groups
}

async function generateApiDocs() {
  const groups = scanRoutes()
  const totalRoutes = Object.values(groups).reduce((s, r) => s + r.length, 0)
  const totalFiles = Object.keys(groups).length

  let md = `${HEADER}\n`
  md += `# API Reference\n\n`
  md += `> Generated: ${new Date().toISOString()} | Source: \`routes/\`, \`integration/\`\n\n`
  md += `**${totalRoutes} endpoint${totalRoutes !== 1 ? 's' : ''} across ${totalFiles} file${totalFiles !== 1 ? 's' : ''}**\n\n`

  const allRoutes = Object.values(groups).flat()
  if (allRoutes.length > 0) {
    md += `## Summary\n\n`
    md += `| Method | Path | Services | Auth | File |\n`
    md += `|--------|------|----------|------|------|\n`
    for (const r of allRoutes) {
      const services = r.services.length > 0 ? r.services.map(s => `\`${s}\``).join(', ') : '-'
      md += `| **${r.method}** | \`${r.path}\` | ${services} | ${r.auth} | \`${r.file}\` |\n`
    }
    md += '\n'
  }

  for (const [file, routes] of Object.entries(groups)) {
    md += `---\n\n`
    md += `## \`${file}\`\n\n`
    for (const r of routes) {
      md += `### ${r.method} \`${r.path}\`\n\n`
      if (r.description) md += `${r.description}\n\n`
      md += `- **Auth:** ${r.auth}\n`
      if (r.services.length > 0) md += `- **Services:** ${r.services.map(s => `\`${s}\``).join(', ')}\n`
      md += '\n'
    }
  }

  if (totalRoutes === 0) md += `*No routes found in routes/ or integration/ directories.*\n`

  fs.writeFileSync(OUTPUT_FILE, md, 'utf8')
  console.log(`   ✅ API.md generated (${totalRoutes} endpoints across ${totalFiles} files)`)
}

if (require.main === module) {
  generateApiDocs().catch(err => { console.error('generateApiDocs failed:', err.message); process.exit(1) })
}

module.exports = { generateApiDocs }
