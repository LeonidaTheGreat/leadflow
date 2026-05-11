'use strict'

const fs = require('fs')
const path = require('path')
const assert = require('assert')

function read(relPath) {
  return fs.readFileSync(path.join(process.cwd(), relPath), 'utf8')
}

function mustContain(file, pattern, message) {
  const src = read(file)
  assert(
    pattern.test(src),
    `${file}: ${message}`
  )
}

function mustNotContain(file, pattern, message) {
  const src = read(file)
  assert(
    !pattern.test(src),
    `${file}: ${message}`
  )
}

const routeFile = 'product/lead-response/dashboard/app/api/webhook/route.ts'
const inboundFile = 'product/lead-response/dashboard/lib/services/inbound-sms-service.ts'
const mapperFile = 'product/lead-response/dashboard/lib/agent-mapper.ts'

mustContain(routeFile, /\.eq\('status',\s*'active'\)/, 'must query active agents using status field')
mustNotContain(routeFile, /\.eq\('is_active',\s*true\)/, 'must not query legacy is_active flag')
mustContain(routeFile, /realEstateAgentRowToAgent\(/, 'must map DB row into Agent shape before use')

mustContain(inboundFile, /\.eq\('status',\s*'active'\)/, 'inbound service must query active agents by status')
mustNotContain(inboundFile, /\.eq\('is_active',\s*true\)/, 'inbound service must not query legacy is_active')
mustContain(inboundFile, /realEstateAgentRowToAgent\(/, 'inbound service must map DB row into Agent shape')

mustContain(mapperFile, /const DEFAULT_AGENT_SETTINGS/, 'mapper must provide default settings for required Agent fields')
mustContain(mapperFile, /timezone:\s*row\.timezone\s*\|\|\s*'America\/New_York'/, 'mapper must default timezone')

console.log('PASS pr-1566-agent-mapper-regression.test.js')
