import fs from 'node:fs'
import path from 'node:path'

describe('middleware admin simulator access regression', () => {
  const proxyPath = path.join(process.cwd(), 'proxy.ts')
  const proxyExists = fs.existsSync(proxyPath)

  const testFn = proxyExists ? it : it.skip

  testFn('keeps admin simulator as explicit public bypass in proxy', () => {
    const source = fs.readFileSync(proxyPath, 'utf8')
    expect(source).toContain("const PUBLIC_ROUTE_PREFIXES = [")
    expect(source).toContain("'/admin/simulator'")
    expect(source).toContain('!isPublicBypassRoute && PROTECTED_ROUTES.some')
  })
})
