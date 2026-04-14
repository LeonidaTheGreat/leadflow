/**
 * Tests for US-2: Persistent Give Feedback button in dashboard
 * Verifies FeedbackButton component and /api/feedback route exist and behave correctly.
 */

const fs = require('fs')
const path = require('path')

const DASHBOARD_ROOT = path.join(__dirname, '..', 'product', 'lead-response', 'dashboard')

describe('US-2: Feedback Button — file existence checks', () => {
  test('FeedbackButton component exists', () => {
    const filePath = path.join(DASHBOARD_ROOT, 'components', 'dashboard', 'FeedbackButton.tsx')
    expect(fs.existsSync(filePath)).toBe(true)
  })

  test('FeedbackButton component exports FeedbackButton function', () => {
    const filePath = path.join(DASHBOARD_ROOT, 'components', 'dashboard', 'FeedbackButton.tsx')
    const content = fs.readFileSync(filePath, 'utf8')
    expect(content).toContain('export function FeedbackButton')
  })

  test('FeedbackButton supports all required feedback types', () => {
    const filePath = path.join(DASHBOARD_ROOT, 'components', 'dashboard', 'FeedbackButton.tsx')
    const content = fs.readFileSync(filePath, 'utf8')
    expect(content).toContain("'praise'")
    expect(content).toContain("'bug'")
    expect(content).toContain("'idea'")
    expect(content).toContain("'frustration'")
  })

  test('FeedbackButton calls /api/feedback endpoint', () => {
    const filePath = path.join(DASHBOARD_ROOT, 'components', 'dashboard', 'FeedbackButton.tsx')
    const content = fs.readFileSync(filePath, 'utf8')
    expect(content).toContain('/api/feedback')
    expect(content).toContain("method: 'POST'")
  })

  test('/api/feedback route file exists', () => {
    const filePath = path.join(DASHBOARD_ROOT, 'app', 'api', 'feedback', 'route.ts')
    expect(fs.existsSync(filePath)).toBe(true)
  })

  test('/api/feedback route exports POST handler', () => {
    const filePath = path.join(DASHBOARD_ROOT, 'app', 'api', 'feedback', 'route.ts')
    const content = fs.readFileSync(filePath, 'utf8')
    expect(content).toContain('export async function POST')
  })

  test('/api/feedback route uses validateSession for auth', () => {
    const filePath = path.join(DASHBOARD_ROOT, 'app', 'api', 'feedback', 'route.ts')
    const content = fs.readFileSync(filePath, 'utf8')
    expect(content).toContain('validateSession')
    expect(content).toContain('Unauthorized')
  })

  test('/api/feedback route calls submitProductFeedback', () => {
    const filePath = path.join(DASHBOARD_ROOT, 'app', 'api', 'feedback', 'route.ts')
    const content = fs.readFileSync(filePath, 'utf8')
    expect(content).toContain('submitProductFeedback')
  })

  test('/api/feedback route validates feedback types', () => {
    const filePath = path.join(DASHBOARD_ROOT, 'app', 'api', 'feedback', 'route.ts')
    const content = fs.readFileSync(filePath, 'utf8')
    expect(content).toContain("'praise'")
    expect(content).toContain("'bug'")
    expect(content).toContain("'idea'")
    expect(content).toContain("'frustration'")
  })

  test('/api/feedback route enforces 500 char content limit', () => {
    const filePath = path.join(DASHBOARD_ROOT, 'app', 'api', 'feedback', 'route.ts')
    const content = fs.readFileSync(filePath, 'utf8')
    expect(content).toContain('500')
  })

  test('dashboard layout imports and renders FeedbackButton', () => {
    const filePath = path.join(DASHBOARD_ROOT, 'app', 'dashboard', 'layout.tsx')
    const content = fs.readFileSync(filePath, 'utf8')
    expect(content).toContain("import { FeedbackButton }")
    expect(content).toContain('<FeedbackButton />')
  })

  test('dashboard layout preserves NPSPromptContainer', () => {
    const filePath = path.join(DASHBOARD_ROOT, 'app', 'dashboard', 'layout.tsx')
    const content = fs.readFileSync(filePath, 'utf8')
    expect(content).toContain('NPSPromptContainer')
  })

  test('/api/feedback route has no conflict markers', () => {
    const filePath = path.join(DASHBOARD_ROOT, 'app', 'api', 'feedback', 'route.ts')
    const content = fs.readFileSync(filePath, 'utf8')
    expect(content).not.toContain('<<<<<<<')
    expect(content).not.toContain('>>>>>>>')
    expect(content).not.toContain('=======')
  })

  test('dashboard layout has no conflict markers', () => {
    const filePath = path.join(DASHBOARD_ROOT, 'app', 'dashboard', 'layout.tsx')
    const content = fs.readFileSync(filePath, 'utf8')
    expect(content).not.toContain('<<<<<<<')
    expect(content).not.toContain('>>>>>>>')
    expect(content).not.toContain('=======')
  })
})
