'use strict'



const fs = require('fs')
const path = require('path')

const projectDir = path.resolve(__dirname, '..')
const routeDirs = [
  path.join(projectDir, 'routes'),
  path.join(projectDir, 'app', 'api')
]

const routeFilePattern = /\.(js|ts|tsx)$/

function listRouteFiles(dir) {
  const files = []
  if (!fs.existsSync(dir)) return files

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)
      if (entry.isDirectory()) {
        walk(fullPath)
        continue
      }
      if (routeFilePattern.test(entry.name)) {
        files.push(fullPath)
      }
    }
  }

  walk(dir)
  return files
}

function countDirectDbFromCalls(content) {
  const callPattern = /([A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*)\s*\.\s*from\s*\(/g
  let match
  let count = 0

  while ((match = callPattern.exec(content)) !== null) {
    const target = match[1].replace(/\s+/g, '')
    if (/(^|\.)(db|supabase)(\.|$)/i.test(target)) {
      count += 1
    }
  }

  return count
}

const violations = []

for (const dir of routeDirs) {
  for (const filePath of listRouteFiles(dir)) {
    const content = fs.readFileSync(filePath, 'utf8')
    const matches = countDirectDbFromCalls(content)
    if (matches > 0) {
      violations.push(`${path.relative(projectDir, filePath)}: ${matches} direct DB .from() calls`)
    }
  }
}

if (violations.length > 0) {
  console.error(`${violations.length} route files with direct .from() calls`)
  for (const violation of violations) {
    console.error(violation)
  }
  process.exit(1)
}

console.log('PASS no_direct_db: no direct database .from() calls in backend route handlers')
