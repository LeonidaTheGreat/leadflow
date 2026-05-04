'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const navPath = path.join(__dirname, '..', 'app', 'dashboard', 'dashboard-nav.tsx')
const source = fs.readFileSync(navPath, 'utf8')

assert(source.includes("data-testid=\"nav-link-logout\""), 'Expected logout test id in dashboard nav')
assert(source.includes("fetch('/api/auth/logout', { method: 'POST' })"), 'Expected POST logout request in dashboard nav')
assert(source.includes("window.location.href = '/login'"), 'Expected redirect to /login after logout')

console.log('PASS pr-1468-logout-nav.test.js')
