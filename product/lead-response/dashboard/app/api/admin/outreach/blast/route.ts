import { NextRequest, NextResponse } from 'next/server'
import crypto, { timingSafeEqual } from 'crypto'
import { postgrestAdmin } from '@/lib/db'
import { sendPilotOutreachEmail } from '@/lib/outreach-email-service'
import { logger } from '@/lib/logger'

// Verify admin token using constant-time comparison to prevent timing attacks
function verifyAdminToken(incoming: string | null, secret: string | undefined): boolean {
  if (!incoming || !secret) return false
  try {
    const a = Buffer.from(incoming)
    const b = Buffer.from(secret)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

// Admin auth check — verify X-Admin-Token header matches ADMIN_SECRET
function checkAdminAuth(request: NextRequest): boolean {
  const adminToken = request.headers.get('x-admin-token')
  const expectedToken = process.env.ADMIN_SECRET
  return verifyAdminToken(adminToken, expectedToken)
}

// Exact pain point copy per target — content brief: "do not auto-summarize"
const PAIN_POINT_MAP: Record<string, string> = {
  'Amanda Foster': 'missing leads because you couldn\'t respond fast enough',
  'Brandon White': 'missing leads while you were in showings',
  'Christopher Davis': 'needing a better system to catch leads between appointments',
  'Emily Thompson': 'needing backup for lead response during your maternity leave',
  'James Wilson': 'wanting to be the first agent to respond to every inquiry',
  'Jennifer Rodriguez': 'running Facebook ads and losing leads to agents who respond faster',
  'Jessica Martinez': 'wanting to respond to every lead the moment it comes in',
  "Kevin O'Brien": 'needing a more consistent response system',
  'Marcus Chen': 'wanting the kind of automated follow-up you had in your Salesforce days',
  'Michael Brown': 'wanting to systematize your lead response so nothing falls through',
  'Michelle Garcia': 'running Google Ads and wanting better lead response to protect your spend',
  'Nicole Anderson': 'wanting to be first to respond to every lead inquiry',
  'Robert Taylor': 'wanting to apply your tech background to make your process more efficient',
  'Sarah Mitchell': 'wanting to clone yourself for lead response',
  'Stephanie Lee': 'buying Zillow leads and losing them to agents who respond in seconds',
  'Daniel Jackson': 'looking for automation tools to scale your team\'s lead handling',
  'David Park': 'wanting to build out the systems side of your growing team',
  'Lisa Wong': 'wanting AI tools that match the quality of your Compass brand',
  'Rachel Kim': 'wanting to automate more of your process',
  'Ryan Patel': 'wanting to modernize the systems in your family business',
}

// Segment B: team leads get a different body paragraph
const TEAM_LEADS = new Set(['Daniel Jackson', 'David Park', 'Lisa Wong', 'Rachel Kim', 'Ryan Patel'])

function generateDemoToken(): { rawToken: string; tokenHash: string } {
  const rawToken = crypto.randomBytes(24).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
  return { rawToken, tokenHash }
}

/**
 * POST /api/admin/outreach/blast
 *
 * Sends personalized outreach emails to all pilot_recruitment_targets with
 * status="identified" that have not yet received an initial touchpoint.
 *
 * For each eligible target:
 *   1. Checks for existing initial touchpoint (skips if found)
 *   2. Generates a demo token (stored hashed in demo_tokens table)
 *   3. Sends personalized email via Resend (via outreach-email-service)
 *   4. Inserts a touchpoint row (touch_type="initial", channel="email")
 *   5. Updates target status to "contacted"
 *
 * Returns: { sent: N, skipped: N, errors: string[] }
 *
 * Auth: X-Admin-Token header (must match ADMIN_SECRET)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    if (!checkAdminAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Fetch all identified targets
    const { data: targets, error: targetsError } = await postgrestAdmin
      .from('pilot_recruitment_targets')
      .select('id,name,email,location,notes,status')
      .eq('status', 'identified')

    if (targetsError) {
      logger.error('[outreach/blast] Failed to fetch targets:', targetsError)
      return NextResponse.json({ error: 'Failed to fetch targets' }, { status: 500 })
    }

    if (!targets || targets.length === 0) {
      return NextResponse.json({ sent: 0, skipped: 0, errors: [] })
    }

    let sent = 0
    let skipped = 0
    const errors: string[] = []

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://app.leadflow.ai').trim()

    for (const target of targets) {
      const targetId = target.id as string
      const name = (target.name as string) || ''
      const email = target.email as string | null

      // Skip targets with no email
      if (!email) {
        skipped++
        continue
      }

      try {
        // 2. Check for existing initial touchpoint — skip if already sent
        const { data: existingTouchpoint } = await postgrestAdmin
          .from('pilot_recruitment_touchpoints')
          .select('id')
          .eq('target_id', targetId)
          .eq('touch_type', 'initial')
          .maybeSingle()

        if (existingTouchpoint) {
          skipped++
          continue
        }

        // 3. Generate a demo token
        const { rawToken, tokenHash } = generateDemoToken()
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

        const { error: tokenError } = await postgrestAdmin
          .from('demo_tokens')
          .insert({
            token: tokenHash,
            expires_at: expiresAt,
            agent_context: { label: `outreach-${targetId}`, created_by: 'outreach-blast' },
          })

        if (tokenError) {
          logger.error(`[outreach/blast] Failed to create demo token for target ${targetId}:`, tokenError)
          errors.push(`${name} (${email}): failed to create demo token`)
          continue
        }

        const demoLink = `${appUrl}/demo/${rawToken}`

        // 4. Extract first name and pain point
        const firstName = name.split(' ')[0] || name
        const location = (target.location as string | null) || ''
        // Use hardcoded pain point map — content brief says "do not auto-summarize"
        const painPoint = PAIN_POINT_MAP[name] || ''
        const isTeamLead = TEAM_LEADS.has(name)

        // 5. Send personalized email
        const emailSent = await sendPilotOutreachEmail(email, targetId, {
          firstName,
          location,
          painPoint,
          demoLink,
          isTeamLead,
        })

        if (!emailSent) {
          errors.push(`${name} (${email}): email delivery failed`)
          continue
        }

        // 6. Record touchpoint
        const { error: touchpointError } = await postgrestAdmin
          .from('pilot_recruitment_touchpoints')
          .insert({
            target_id: targetId,
            channel: 'email',
            touch_type: 'initial',
            sent_at: new Date().toISOString(),
            utm_source: 'outreach-blast',
            utm_medium: 'email',
            utm_content: 'pilot-outreach-v1',
          })

        if (touchpointError) {
          logger.error(`[outreach/blast] Failed to record touchpoint for ${targetId}:`, touchpointError)
          // Don't fail the whole send — touchpoint is best-effort; target was already emailed
        }

        // 7. Update target status
        const { error: updateError } = await postgrestAdmin
          .from('pilot_recruitment_targets')
          .update({ status: 'contacted' })
          .eq('id', targetId)

        if (updateError) {
          logger.error(`[outreach/blast] Failed to update target status for ${targetId}:`, updateError)
          // Non-fatal — email was already sent
        }

        sent++
      } catch (err: any) {
        logger.error(`[outreach/blast] Unexpected error for target ${targetId}:`, err)
        errors.push(`${name} (${email}): unexpected error`)
      }
    }

    logger.info(`[outreach/blast] Blast complete: sent=${sent}, skipped=${skipped}, errors=${errors.length}`)

    return NextResponse.json({ sent, skipped, errors })
  } catch (err: any) {
    logger.error('[outreach/blast] Fatal error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/admin/outreach/blast
 *
 * Returns campaign stats for the outreach blast admin page.
 *
 * Auth: X-Admin-Token header
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    if (!checkAdminAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: targets, error } = await postgrestAdmin
      .from('pilot_recruitment_targets')
      .select('id,status')

    if (error) {
      logger.error('[outreach/blast] Failed to fetch stats:', error)
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }

    const all = targets ?? []
    const stats = {
      identified: all.filter((t: any) => t.status === 'identified').length,
      contacted: all.filter((t: any) => t.status === 'contacted').length,
      responded: all.filter((t: any) => t.status === 'responded').length,
      signed_up: all.filter((t: any) => t.status === 'signed_up').length,
      total: all.length,
    }

    return NextResponse.json({ stats })
  } catch (err: any) {
    logger.error('[outreach/blast] Stats error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

