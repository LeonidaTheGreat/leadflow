/**
 * Guard: pilot-signup page must post to /api/auth/pilot-signup (real_estate_agents),
 * NOT /api/pilot-signup (pilot_signups). Login reads from real_estate_agents — if signup
 * writes to a different table, users can't log in.
 */

const fs = require('fs')
const path = require('path')
const assert = require('assert')

const PAGE_PATH = path.join(
  __dirname,
  '../../product/lead-response/dashboard/app/pilot-signup/page.tsx'
)

describe('Pilot signup → login table alignment', () => {
  let source

  before(() => {
    source = fs.readFileSync(PAGE_PATH, 'utf8')
  })

  it('posts to /api/auth/pilot-signup (writes to real_estate_agents)', () => {
    assert.ok(
      source.includes('/api/auth/pilot-signup'),
      'page.tsx must fetch /api/auth/pilot-signup'
    )
  })

  it('does NOT post to /api/pilot-signup (writes to pilot_signups)', () => {
    // Exclude import/comment lines — only match actual fetch calls
    const fetchLine = source.match(/fetch\(['"`]\/api\/pilot-signup['"`]/g)
    assert.ok(
      !fetchLine,
      `page.tsx must not call /api/pilot-signup (found: ${fetchLine}). ` +
        'That endpoint writes to pilot_signups; login reads real_estate_agents.'
    )
  })

  it('includes a password field (required by /api/auth/pilot-signup)', () => {
    assert.ok(
      source.includes('password'),
      'page.tsx must include a password field'
    )
  })
})
