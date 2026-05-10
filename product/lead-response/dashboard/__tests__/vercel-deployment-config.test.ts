import fs from 'fs'
import path from 'path'

/**
 * Regression guard: prevents the wrong-directory deployment that caused the
 * 2026-05-08 full outage (server.js Lambda deployed to leadflow-ai instead of
 * the Next.js dashboard build from product/lead-response/dashboard/).
 */
describe('vercel-deployment-config', () => {
  const dashboardRoot = process.cwd()

  it('vercel project is linked to leadflow-ai (not fub-inbound-webhook)', () => {
    const projectJsonPath = path.join(dashboardRoot, '.vercel', 'project.json')
    expect(fs.existsSync(projectJsonPath)).toBe(true)

    const projectJson = JSON.parse(fs.readFileSync(projectJsonPath, 'utf8'))
    // leadflow-ai project — this must never change to the webhook project ID
    expect(projectJson.projectId).toBe('prj_p9ZX952UhE1cl1PYZAgVW53FqVm9')
    expect(projectJson.projectName).toBe('leadflow-ai')
  })

  it('next.config.ts exists (ensures Next.js framework is detected by Vercel)', () => {
    const nextConfigPath = path.join(dashboardRoot, 'next.config.ts')
    expect(fs.existsSync(nextConfigPath)).toBe(true)
  })

  it('vercel.json does not override builds (would break Next.js auto-detection)', () => {
    const vercelJsonPath = path.join(dashboardRoot, 'vercel.json')
    if (!fs.existsSync(vercelJsonPath)) return

    const vercelJson = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'))
    // A `builds` array forces a specific builder — it would override Next.js detection
    expect(vercelJson).not.toHaveProperty('builds')
  })

  it('package.json has a next build script (required by Vercel Next.js framework detection)', () => {
    const pkgPath = path.join(dashboardRoot, 'package.json')
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
    expect(pkg.scripts?.build).toContain('next build')
  })
})
