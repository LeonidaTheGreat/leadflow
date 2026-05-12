'use strict'

const fs = require('fs')
const path = require('path')

describe('pilot-signup auth/table alignment', () => {
  const pagePath = path.join(
    __dirname,
    '../../product/lead-response/dashboard/app/pilot-signup/page.tsx'
  )
  const source = fs.readFileSync(pagePath, 'utf8')

  test('posts signup to /api/auth/pilot-signup (account-creating route)', () => {
    expect(source).toContain("fetch('/api/auth/pilot-signup'")
  })

  test('does not post to /api/pilot-signup lead-intake route', () => {
    expect(source).not.toContain("fetch('/api/pilot-signup'")
  })

  test('includes password in form state and request payload', () => {
    expect(source).toContain("password: ''")
    expect(source).toContain('name="password"')
    expect(source).toContain('data-testid="pilot-signup-password-input"')
    expect(source).toContain('password: formData.password')
  })
})
