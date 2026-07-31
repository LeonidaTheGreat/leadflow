'use strict'
/**
 * QC E2E test for PR #2182: extend isLocalServerChunksHealthy to cover all
 * CSS and JS bundles (not just the first CSS chunk).
 *
 * Key regression being guarded: old code used body.match() → first CSS chunk
 * only. A stale JS bundle would NOT have been detected, causing Playwright tests
 * to run against a local server with hydration errors.
 */

const http = require('http')
const assert = require('assert')

let passed = 0
let total = 0

function ok(name) { passed++; console.log(`  ✅ ${name}`) }
function fail(name, msg) { console.log(`  ❌ ${name}: ${msg}`) }

function check(name, fn) {
  total++
  try { fn(); ok(name) } catch (err) { fail(name, err.message) }
}

// ── Replicate the extraction logic from the PR ────────────────────────────────
// (Testing the algorithm, not just the test wrapper)

function extractChunks(html) {
  const cssChunks = [...html.matchAll(/href="(\/_next\/static\/[^"]+\.css)"/g)].map(m => m[1])
  const jsChunks  = [...html.matchAll(/src="(\/_next\/static\/[^"]+\.js)"/g)].map(m => m[1])
  return [...cssChunks, ...jsChunks]
}

// ── Unit: regex extraction ────────────────────────────────────────────────────

console.log('── Unit: chunk extraction regex ─────────────────────────────────')

check('extracts single CSS chunk', () => {
  const html = `<link rel="stylesheet" href="/_next/static/css/main-abc.css" />`
  assert.deepStrictEqual(extractChunks(html), ['/_next/static/css/main-abc.css'])
})

check('extracts single JS chunk', () => {
  const html = `<script src="/_next/static/chunks/main-def.js"></script>`
  assert.deepStrictEqual(extractChunks(html), ['/_next/static/chunks/main-def.js'])
})

check('extracts BOTH CSS and JS chunks (key fix: not just first CSS)', () => {
  const html = `
    <link href="/_next/static/css/a.css" />
    <link href="/_next/static/css/b.css" />
    <script src="/_next/static/chunks/main.js"></script>
    <script src="/_next/static/chunks/page.js"></script>
  `
  const chunks = extractChunks(html)
  assert.strictEqual(chunks.length, 4, `Expected 4 chunks, got ${chunks.length}`)
  assert.strictEqual(chunks.filter(c => c.endsWith('.css')).length, 2)
  assert.strictEqual(chunks.filter(c => c.endsWith('.js')).length, 2)
})

check('returns empty array for page with no static assets', () => {
  assert.deepStrictEqual(extractChunks('<html><body><p>Hello</p></body></html>'), [])
})

check('ignores non-_next/static paths', () => {
  const html = `
    <link href="/vendor/styles.css" />
    <script src="/app.js"></script>
    <link href="/_next/static/css/ok.css" />
  `
  assert.deepStrictEqual(extractChunks(html), ['/_next/static/css/ok.css'])
})

// ── Integration: replicated health check against a mock server ───────────────

console.log('\n── Integration: health check with mock HTTP server ──────────────')

function httpGet(hostname, port, path, method = 'GET') {
  return new Promise((resolve) => {
    const req = http.request(
      { hostname, port: parseInt(port || '80', 10), path, method, timeout: 5000 },
      (res) => {
        let body = ''
        res.on('data', (chunk) => { body += chunk })
        res.on('end', () => resolve({ status: res.statusCode, body }))
      }
    )
    req.on('error', () => resolve({ status: 0, body: '' }))
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, body: '' }) })
    req.end()
  })
}

async function isLocalServerChunksHealthy(url) {
  const parsed = new URL(url)
  const hostname = parsed.hostname
  const port = parsed.port

  const { status, body } = await httpGet(hostname, port, '/login', 'GET')
  if (status !== 200 || !body) return false

  const cssChunks = [...body.matchAll(/href="(\/_next\/static\/[^"]+\.css)"/g)].map(m => m[1])
  const jsChunks  = [...body.matchAll(/src="(\/_next\/static\/[^"]+\.js)"/g)].map(m => m[1])
  const allChunks = [...cssChunks, ...jsChunks]

  if (allChunks.length === 0) return true

  const results = await Promise.all(
    allChunks.map(chunkPath => httpGet(hostname, port, chunkPath, 'HEAD'))
  )

  for (let i = 0; i < allChunks.length; i++) {
    if (results[i].status !== 200) return false
  }
  return true
}

function makeServer(handler) {
  return new Promise((resolve) => {
    const srv = http.createServer(handler)
    srv.listen(0, '127.0.0.1', () => resolve(srv))
  })
}

async function runIntegration() {
  // Test A: all CSS + JS chunks 200 → healthy
  {
    total++
    const requestedPaths = []
    const srv = await makeServer((req, res) => {
      requestedPaths.push(`${req.method} ${req.url}`)
      if (req.url === '/login') {
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(`
          <link href="/_next/static/css/main.css" />
          <script src="/_next/static/chunks/main.js"></script>
          <script src="/_next/static/chunks/page.js"></script>
        `)
      } else {
        res.writeHead(200); res.end('')
      }
    })
    const { port } = srv.address()
    const healthy = await isLocalServerChunksHealthy(`http://127.0.0.1:${port}`)
    srv.close()
    const chunkChecks = requestedPaths.filter(p => p.includes('_next/static'))
    if (healthy && chunkChecks.length === 3) {
      ok(`All CSS+JS chunks 200 → healthy (checked ${chunkChecks.length} chunks in parallel)`)
    } else {
      fail('All CSS+JS chunks 200 → healthy', `healthy=${healthy}, chunkChecks=${chunkChecks.length}`)
    }
  }

  // Test B: JS chunk returns 500 → unhealthy
  // THIS IS THE KEY FIX: old code only checked the first CSS chunk; a broken
  // JS bundle would have gone undetected and caused browser test timeouts.
  {
    total++
    const srv = await makeServer((req, res) => {
      if (req.url === '/login') {
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(`
          <link href="/_next/static/css/main.css" />
          <script src="/_next/static/chunks/broken.js"></script>
        `)
      } else if (req.url && req.url.endsWith('.css')) {
        res.writeHead(200); res.end('')
      } else {
        // JS chunk is stale/missing
        res.writeHead(500); res.end('Build chunk not found')
      }
    })
    const { port } = srv.address()
    const healthy = await isLocalServerChunksHealthy(`http://127.0.0.1:${port}`)
    srv.close()
    if (!healthy) {
      ok('Broken JS chunk (500) → unhealthy — key fix verified')
    } else {
      fail('Broken JS chunk (500)', 'INCORRECTLY reported healthy — regression!')
    }
  }

  // Test C: CSS chunk returns 500 → unhealthy (regression guard for original fix)
  {
    total++
    const srv = await makeServer((req, res) => {
      if (req.url === '/login') {
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(`<link href="/_next/static/css/broken.css" />`)
      } else {
        res.writeHead(500); res.end('')
      }
    })
    const { port } = srv.address()
    const healthy = await isLocalServerChunksHealthy(`http://127.0.0.1:${port}`)
    srv.close()
    if (!healthy) {
      ok('Broken CSS chunk (500) → unhealthy')
    } else {
      fail('Broken CSS chunk (500)', 'INCORRECTLY reported healthy')
    }
  }

  // Test D: /login itself returns non-200 → unhealthy
  {
    total++
    const srv = await makeServer((req, res) => {
      res.writeHead(503); res.end('')
    })
    const { port } = srv.address()
    const healthy = await isLocalServerChunksHealthy(`http://127.0.0.1:${port}`)
    srv.close()
    if (!healthy) {
      ok('/login returns 503 → unhealthy')
    } else {
      fail('/login returns 503', 'INCORRECTLY reported healthy')
    }
  }

  // Test E: Page has no chunks → healthy (no assets = no problem)
  {
    total++
    const srv = await makeServer((req, res) => {
      if (req.url === '/login') {
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end('<html><body>Login</body></html>')
      } else {
        res.writeHead(200); res.end('')
      }
    })
    const { port } = srv.address()
    const healthy = await isLocalServerChunksHealthy(`http://127.0.0.1:${port}`)
    srv.close()
    if (healthy) {
      ok('Page with no chunks → healthy (correct default)')
    } else {
      fail('Page with no chunks', 'INCORRECTLY reported unhealthy')
    }
  }

  // Test F: second of two JS chunks is broken → unhealthy (parallel check catches it)
  {
    total++
    const srv = await makeServer((req, res) => {
      if (req.url === '/login') {
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(`
          <script src="/_next/static/chunks/ok.js"></script>
          <script src="/_next/static/chunks/broken.js"></script>
        `)
      } else if (req.url && req.url.includes('ok.js')) {
        res.writeHead(200); res.end('')
      } else {
        res.writeHead(500); res.end('')
      }
    })
    const { port } = srv.address()
    const healthy = await isLocalServerChunksHealthy(`http://127.0.0.1:${port}`)
    srv.close()
    if (!healthy) {
      ok('Second JS chunk broken → unhealthy (parallel check finds non-first failures)')
    } else {
      fail('Second JS chunk broken', 'INCORRECTLY reported healthy — parallel check missed it')
    }
  }

  console.log(`\n${passed}/${total} tests passed`)
  if (passed !== total) process.exit(1)
}

runIntegration().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
