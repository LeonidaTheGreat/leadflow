'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const dashboardDir = path.join(__dirname, '..')
const proxyPath = path.join(dashboardDir, 'proxy.ts')
const middlewarePath = path.join(dashboardDir, 'middleware.ts')

assert.ok(fs.existsSync(proxyPath), 'proxy.ts must exist')
assert.ok(!fs.existsSync(middlewarePath), 'middleware.ts must be removed after migration')

const source = fs.readFileSync(proxyPath, 'utf8')
assert.ok(source.includes('export async function proxy('), 'proxy.ts must export proxy(request)')
assert.ok(source.includes('export const config = {'), 'proxy.ts must export matcher config')
assert.ok(source.includes('matcher:'), 'proxy.ts must include matcher settings')

console.log('PASS: proxy migration wiring verified')
