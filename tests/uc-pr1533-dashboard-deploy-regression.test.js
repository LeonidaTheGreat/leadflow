'use strict';

const assert = require('assert');

const BASE_URL = process.env.LEADFLOW_E2E_BASE_URL || 'https://leadflow-ai-five.vercel.app';

async function fetchWithRedirects(url, maxRedirects = 5) {
  let current = url;

  for (let i = 0; i <= maxRedirects; i += 1) {
    const res = await fetch(current, { redirect: 'manual' });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      assert(location, `Redirect without location header for ${current}`);
      current = new URL(location, current).toString();
      continue;
    }

    return res;
  }

  throw new Error(`Too many redirects for ${url}`);
}

async function main() {
  const routes = ['/', '/signup', '/signup/trial', '/login', '/pricing', '/setup', '/dashboard'];

  for (const route of routes) {
    const res = await fetchWithRedirects(`${BASE_URL}${route}`);
    const body = await res.text();
    assert.strictEqual(res.status, 200, `${route} returned ${res.status}`);
    assert(!/FUNCTION_INVOCATION_FAILED|Internal Server Error|Application error/i.test(body), `${route} returned error content`);
  }

  const health = await fetchWithRedirects(`${BASE_URL}/api/health`);
  assert.strictEqual(health.status, 200, `/api/health returned ${health.status}`);

  console.log('PASS: Dashboard deploy regression smoke checks succeeded');
}

main().catch((err) => {
  console.error('FAIL:', err.message);
  process.exit(1);
});
