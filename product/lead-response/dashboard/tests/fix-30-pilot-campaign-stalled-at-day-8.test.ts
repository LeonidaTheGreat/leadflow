import fs from 'fs'
import path from 'path'

describe('fix-30-pilot-campaign-stalled-at-day-8', () => {
  const routePath = path.join(
    __dirname,
    '..',
    'app/api/cron/pilot-recruitment-outreach/route.ts'
  )

  it('executes outreach blast on GET (vercel cron method) with auth guard', () => {
    const src = fs.readFileSync(routePath, 'utf8')

    expect(src).toContain('async function runOutreach(request: NextRequest)')
    expect(src).toContain('export async function GET(request: NextRequest)')
    expect(src).toContain('const result = await blastService.runBlast()')
    expect(src).toContain('if (!isAuthorized(request))')

    const getMatch = src.match(/export async function GET\(request: NextRequest\) \{([\s\S]*?)\n\}/)
    expect(getMatch?.[1] || '').toContain('return runOutreach(request)')

    expect(src).not.toContain("message: 'Pilot recruitment outreach cron endpoint'")
  })
})
