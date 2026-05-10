/**
 * @jest-environment node
 *
 * Regression guard: prevents the wrong-directory deployment that caused the
 * 2026-05-08 outage (server.js Lambda deployed to leadflow-ai instead of the
 * Next.js dashboard build from product/lead-response/dashboard/).
 *
 * These tests run statically against the filesystem — no network calls, no
 * live Vercel dependency. They catch configuration drift before deployment.
 */
import fs from 'fs'
import path from 'path'

describe('vercel-deployment-config', () => {
  const dashboardRoot = process.cwd()

  it('vercel project is linked to leadflow-ai (not fub-inbound-webhook)', () => {
    const projectJsonPath = path.join(dashboardRoot, '.vercel', 'project.json')
    expect(fs.existsSync(projectJsonPath)).toBe(true)

    const projectJson = JSON.parse(fs.readFileSync(projectJsonPath, 'utf8'))
    // leadflow-ai project — must never drift to the webhook project ID
    expect(projectJson.projectId).toBe('prj_p9ZX952UhE1cl1PYZAgVW53FqVm9')
    expect(projectJson.projectName).toBe('leadflow-ai')
  })

  it('next.config.ts exists (ensures Next.js framework is detected by Vercel)', () => {
    const nextConfigPath = path.join(dashboardRoot, 'next.config.ts')
    expect(fs.existsSync(nextConfigPath)).toBe(true)
  })

  it('vercel.json does not override builds (a builds array forces a specific builder and overrides Next.js auto-detection)', () => {
    const vercelJsonPath = path.join(dashboardRoot, 'vercel.json')
    if (!fs.existsSync(vercelJsonPath)) return

    const vercelJson = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'))
    expect(vercelJson).not.toHaveProperty('builds')
  })

  it('package.json has a next build script (required for Vercel Next.js framework detection)', () => {
    const pkgPath = path.join(dashboardRoot, 'package.json')
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
    expect(pkg.scripts?.build).toContain('next build')
  })
})
