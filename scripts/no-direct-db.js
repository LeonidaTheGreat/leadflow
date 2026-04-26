'use strict';

/**
 * Task Spec
 * What:
 * - Add scripts/no-direct-db.js with `runNoDirectDbGate()` and helper functions
 *   (`collectRouteFiles()`, `countFromCalls()`, `shouldSkipRoutePath()`) to enforce
 *   no direct `.from()` calls in backend route handlers.
 * - Update package.json scripts to expose `npm run no_direct_db`.
 *
 * Verify:
 * - Run `npm run no_direct_db` and expect exit code 0 with "no direct .from() calls found".
 * - Run `rg -n "\"no_direct_db\"" package.json` and expect the script entry to exist.
 * - Ensure violations report file paths and counts when direct `.from()` calls are introduced.
 *
 * Boundaries:
 * - Do not refactor route/business logic files.
 * - Do not touch database schema, migrations, or service-layer behavior.
 * - Do not modify unrelated quality gates.
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ROUTE_DIRS = [
  path.join(PROJECT_ROOT, 'routes'),
  path.join(PROJECT_ROOT, 'app', 'api')
];
const ROUTE_FILE_PATTERN = /\.(js|ts|tsx)$/;
const SKIP_PATH_SEGMENTS = new Set(['health', 'debug', 'smoke', 'internal']);

function countFromCalls(content) {
  return (content.match(/\.from\s*\(/g) || []).length;
}

function shouldSkipRoutePath(relativePath) {
  const normalized = relativePath.split(path.sep).join('/').toLowerCase();
  const segments = normalized.split('/');
  return segments.some((segment) => SKIP_PATH_SEGMENTS.has(segment));
}

function collectRouteFiles(dir, files) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectRouteFiles(fullPath, files);
      continue;
    }

    if (!ROUTE_FILE_PATTERN.test(entry.name)) {
      continue;
    }

    const relativePath = path.relative(PROJECT_ROOT, fullPath);
    if (shouldSkipRoutePath(relativePath)) {
      continue;
    }

    files.push(fullPath);
  }
}

function runNoDirectDbGate() {
  const routeFiles = [];
  for (const dir of ROUTE_DIRS) {
    if (fs.existsSync(dir)) {
      collectRouteFiles(dir, routeFiles);
    }
  }

  const violations = [];
  for (const filePath of routeFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    const directFromCalls = countFromCalls(content);
    if (directFromCalls > 0) {
      violations.push({
        file: path.relative(PROJECT_ROOT, filePath),
        count: directFromCalls
      });
    }
  }

  if (violations.length === 0) {
    console.log('no_direct_db: pass (no direct .from() calls found)');
    return 0;
  }

  console.error(`no_direct_db: fail (${violations.length} route files with direct .from() calls)`);
  for (const violation of violations) {
    console.error(`- ${violation.file}: ${violation.count}`);
  }
  return 1;
}

const exitCode = runNoDirectDbGate();
process.exitCode = exitCode;
