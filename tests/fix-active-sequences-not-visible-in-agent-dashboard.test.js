/**
 * Tests: Active sequences not visible in agent dashboard (UC-8)
 * Task: 3d76b154-84b1-420b-9439-ac59ed9db2aa
 *
 * Verifies:
 * 1. SequenceStatusCard component exists and exports correctly
 * 2. Lead detail page imports SequenceStatusCard and getLeadSequences
 * 3. Pause/resume API routes exist
 * 4. Sequence types are correctly labelled
 */

const fs = require('fs')
const path = require('path')

const DASHBOARD_ROOT = path.join(
  __dirname,
  '../product/lead-response/dashboard'
)

describe('fix-active-sequences-not-visible-in-agent-dashboard', () => {
  const sequenceCardPath = path.join(
    DASHBOARD_ROOT,
    'components/dashboard/SequenceStatusCard.tsx'
  )
  const leadDetailPath = path.join(
    DASHBOARD_ROOT,
    'app/dashboard/leads/[id]/page.tsx'
  )
  const pauseRoutePath = path.join(
    DASHBOARD_ROOT,
    'app/api/sequences/[id]/pause/route.ts'
  )
  const resumeRoutePath = path.join(
    DASHBOARD_ROOT,
    'app/api/sequences/[id]/resume/route.ts'
  )

  // ----------------------------------------------------------------
  // 1. SequenceStatusCard component exists
  // ----------------------------------------------------------------
  test('SequenceStatusCard component file exists', () => {
    expect(fs.existsSync(sequenceCardPath)).toBe(true)
  })

  test('SequenceStatusCard exports SequenceStatusCard function', () => {
    const content = fs.readFileSync(sequenceCardPath, 'utf8')
    expect(content).toMatch(/export function SequenceStatusCard/)
  })

  // ----------------------------------------------------------------
  // 2. Component shows key UI elements
  // ----------------------------------------------------------------
  test('SequenceStatusCard renders sequence type labels', () => {
    const content = fs.readFileSync(sequenceCardPath, 'utf8')
    expect(content).toMatch(/No Response/)
    expect(content).toMatch(/Post Viewing/)
    expect(content).toMatch(/No Show/)
    expect(content).toMatch(/Nurture/)
  })

  test('SequenceStatusCard shows step, messages sent, and remaining', () => {
    const content = fs.readFileSync(sequenceCardPath, 'utf8')
    expect(content).toMatch(/step/i)
    expect(content).toMatch(/sent/i)
    expect(content).toMatch(/remaining/i)
  })

  test('SequenceStatusCard shows last_sent_at and next_send_at', () => {
    const content = fs.readFileSync(sequenceCardPath, 'utf8')
    expect(content).toMatch(/last_sent_at/)
    expect(content).toMatch(/next_send_at/)
  })

  test('SequenceStatusCard has pause/resume controls', () => {
    const content = fs.readFileSync(sequenceCardPath, 'utf8')
    expect(content).toMatch(/Pause Sequence/)
    expect(content).toMatch(/Resume Sequence/)
  })

  test('SequenceStatusCard calls correct API endpoints for pause/resume', () => {
    const content = fs.readFileSync(sequenceCardPath, 'utf8')
    // Template literal builds /api/sequences/${sequence.id}/${action} dynamically
    expect(content).toMatch(/\/api\/sequences\//)
    expect(content).toMatch(/pause/)
    expect(content).toMatch(/resume/)
    // Confirm fetch is used (not hardcoded URLs that skip the API)
    expect(content).toMatch(/fetch\(/)
  })

  test('SequenceStatusCard has aria-labels for accessibility', () => {
    const content = fs.readFileSync(sequenceCardPath, 'utf8')
    expect(content).toMatch(/aria-label/)
  })

  // ----------------------------------------------------------------
  // 3. Lead detail page integrates SequenceStatusCard
  // ----------------------------------------------------------------
  test('Lead detail page imports SequenceStatusCard', () => {
    const content = fs.readFileSync(leadDetailPath, 'utf8')
    expect(content).toMatch(/import.*SequenceStatusCard.*from/)
  })

  test('Lead detail page imports getLeadSequences', () => {
    const content = fs.readFileSync(leadDetailPath, 'utf8')
    expect(content).toMatch(/import.*getLeadSequences.*from/)
  })

  test('Lead detail page renders SequenceStatusCard in JSX', () => {
    const content = fs.readFileSync(leadDetailPath, 'utf8')
    expect(content).toMatch(/<SequenceStatusCard/)
  })

  test('Lead detail page fetches sequences alongside messages', () => {
    const content = fs.readFileSync(leadDetailPath, 'utf8')
    // getSequences should be called in Promise.all
    expect(content).toMatch(/getSequences\(/)
  })

  // ----------------------------------------------------------------
  // 4. Pause/resume API routes exist
  // ----------------------------------------------------------------
  test('pause API route exists', () => {
    expect(fs.existsSync(pauseRoutePath)).toBe(true)
  })

  test('resume API route exists', () => {
    expect(fs.existsSync(resumeRoutePath)).toBe(true)
  })

  test('pause route handles POST', () => {
    const content = fs.readFileSync(pauseRoutePath, 'utf8')
    expect(content).toMatch(/export async function POST/)
  })

  test('resume route handles POST', () => {
    const content = fs.readFileSync(resumeRoutePath, 'utf8')
    expect(content).toMatch(/export async function POST/)
  })
})
