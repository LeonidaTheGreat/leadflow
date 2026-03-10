/**
 * E2E Test: NPS API routes /api/nps/verify and /api/nps/submit
 * Task: fix-nps-api-routes-api-nps-verify-and-api-nps-submit-r
 *
 * Verifies that /api/nps/verify and /api/nps/submit no longer return 404,
 * and that they respond correctly to valid and invalid inputs.
 */

'use strict';

const assert = require('assert');
const https = require('https');
const http = require('http');

const BASE_URL = 'https://leadflow-ai-five.vercel.app';

let passed = 0;
let failed = 0;
const results = [];

function log(name, ok, detail) {
  const icon = ok ? '✅' : '❌';
  console.log(`${icon} ${name}${detail ? ' — ' + detail : ''}`);
  results.push({ name, ok, detail });
  if (ok) passed++; else failed++;
}

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const opts = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    };
    const data = body ? JSON.stringify(body) : null;
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);

    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request(opts, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(raw); } catch (_) {}
        resolve({ status: res.statusCode, body: json, raw });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  console.log('============================================================');
  console.log('🧪 NPS API Routes E2E Test');
  console.log('============================================================\n');

  // ── TEST 1: /api/nps/verify not 404 (no token → 400) ─────────────────────
  try {
    const r = await request('GET', '/api/nps/verify');
    log(
      'GET /api/nps/verify exists (not 404)',
      r.status !== 404,
      `HTTP ${r.status}`
    );
    log(
      'GET /api/nps/verify without token → 400',
      r.status === 400,
      `HTTP ${r.status}, body: ${JSON.stringify(r.body)}`
    );
    if (r.body) {
      log(
        'GET /api/nps/verify no-token body has valid:false',
        r.body.valid === false,
        JSON.stringify(r.body)
      );
    }
  } catch (e) {
    log('GET /api/nps/verify reachable', false, e.message);
  }

  // ── TEST 2: /api/nps/verify with invalid token → 400 ─────────────────────
  try {
    const r = await request('GET', '/api/nps/verify?token=invalid.jwt.token');
    log(
      'GET /api/nps/verify invalid token → 400',
      r.status === 400,
      `HTTP ${r.status}`
    );
    if (r.body) {
      log(
        'GET /api/nps/verify invalid token body has valid:false',
        r.body.valid === false,
        JSON.stringify(r.body)
      );
    }
  } catch (e) {
    log('GET /api/nps/verify invalid token test', false, e.message);
  }

  // ── TEST 3: /api/nps/submit not 404 (missing score → 400) ────────────────
  try {
    const r = await request('POST', '/api/nps/submit', {});
    log(
      'POST /api/nps/submit exists (not 404)',
      r.status !== 404,
      `HTTP ${r.status}`
    );
    log(
      'POST /api/nps/submit without score → 400',
      r.status === 400,
      `HTTP ${r.status}, body: ${JSON.stringify(r.body)}`
    );
    if (r.body) {
      log(
        'POST /api/nps/submit no-score body has success:false',
        r.body.success === false,
        JSON.stringify(r.body)
      );
    }
  } catch (e) {
    log('POST /api/nps/submit reachable', false, e.message);
  }

  // ── TEST 4: /api/nps/submit score out of range → 400 ─────────────────────
  try {
    const r = await request('POST', '/api/nps/submit', { score: 11 });
    log(
      'POST /api/nps/submit score=11 → 400',
      r.status === 400,
      `HTTP ${r.status}`
    );
  } catch (e) {
    log('POST /api/nps/submit out-of-range score', false, e.message);
  }

  // ── TEST 5: /api/nps/submit invalid token → 400 ───────────────────────────
  try {
    const r = await request('POST', '/api/nps/submit', {
      token: 'not-a-valid-jwt',
      score: 9,
    });
    log(
      'POST /api/nps/submit invalid JWT token → 400',
      r.status === 400,
      `HTTP ${r.status}`
    );
    if (r.body) {
      log(
        'POST /api/nps/submit invalid token body has success:false',
        r.body.success === false,
        JSON.stringify(r.body)
      );
    }
  } catch (e) {
    log('POST /api/nps/submit invalid token test', false, e.message);
  }

  // ── TEST 6: /api/nps/verify non-GET method returns method-not-allowed ─────
  try {
    const r = await request('POST', '/api/nps/verify', { foo: 'bar' });
    log(
      'POST /api/nps/verify → 405 (method not allowed)',
      r.status === 405,
      `HTTP ${r.status}`
    );
  } catch (e) {
    // Some Next.js versions return 404 for wrong method — acceptable
    log('POST /api/nps/verify method check', false, e.message);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n============================================================');
  console.log('📊 RESULTS');
  console.log('============================================================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Pass Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.ok).forEach(r => console.log(`  ❌ ${r.name}: ${r.detail}`));
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
