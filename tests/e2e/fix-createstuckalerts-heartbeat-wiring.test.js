'use strict'

const fs = require('fs')
const path = require('path')

describe('fix-createstuckalerts heartbeat wiring', () => {
  const scriptPath = path.join(process.cwd(), 'scripts/shell/orchestrator-heartbeat-runner.sh')

  test('heartbeat invokes stuck-agent cron endpoint every cycle', () => {
    const content = fs.readFileSync(scriptPath, 'utf8')

    expect(content).toContain('/api/cron/check-stuck-agents')
    expect(content).toContain('Authorization: Bearer ${CRON_SECRET}')
    expect(content).toContain('NEXT_PUBLIC_BASE_URL')
    expect(content).toContain('curl -sS -o /tmp/leadflow-stuck-alerts-response.json -w "%{http_code}"')
  })
})
