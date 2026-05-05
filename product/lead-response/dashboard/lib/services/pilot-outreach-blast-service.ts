import crypto from 'crypto'

type BlastDeps = {
  db: any
  logger: any
  sendPilotOutreachEmail: (
    to: string,
    targetId: string,
    data: {
      firstName: string
      location: string
      painPoint: string
      demoLink: string
      isTeamLead: boolean
    }
  ) => Promise<boolean>
  appUrl: string
}

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

const TEAM_LEADS = new Set(['Daniel Jackson', 'David Park', 'Lisa Wong', 'Rachel Kim', 'Ryan Patel'])

export class PilotOutreachBlastService {
  private db: any
  private logger: any
  private sendPilotOutreachEmail: BlastDeps['sendPilotOutreachEmail']
  private appUrl: string

  constructor(deps: BlastDeps) {
    this.db = deps.db
    this.logger = deps.logger
    this.sendPilotOutreachEmail = deps.sendPilotOutreachEmail
    this.appUrl = deps.appUrl.trim()
  }

  async runBlast(): Promise<{ sent: number; skipped: number; errors: string[] }> {
    const { data: targets, error: targetsError } = await this.db
      .from('pilot_recruitment_targets')
      .select('id,name,email,location,notes,status')
      .eq('status', 'identified')

    if (targetsError) {
      this.logger.error('[outreach/blast] Failed to fetch targets:', targetsError)
      throw new Error('Failed to fetch targets')
    }

    if (!targets || targets.length === 0) {
      return { sent: 0, skipped: 0, errors: [] }
    }

    let sent = 0
    let skipped = 0
    const errors: string[] = []

    for (const target of targets) {
      const targetId = target.id as string
      const name = (target.name as string) || ''
      const email = target.email as string | null

      if (!email) {
        skipped++
        continue
      }

      try {
        const { data: existingTouchpoint } = await this.db
          .from('pilot_recruitment_touchpoints')
          .select('id')
          .eq('target_id', targetId)
          .eq('touch_type', 'initial')
          .maybeSingle()

        if (existingTouchpoint) {
          skipped++
          continue
        }

        const rawToken = crypto.randomBytes(24).toString('hex')
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

        const { error: tokenError } = await this.db.from('demo_tokens').insert({
          token: tokenHash,
          expires_at: expiresAt,
          agent_context: { label: `outreach-${targetId}`, created_by: 'outreach-blast' },
        })

        if (tokenError) {
          this.logger.error(`[outreach/blast] Failed to create demo token for target ${targetId}:`, tokenError)
          errors.push(`${name} (${email}): failed to create demo token`)
          continue
        }

        const demoLink = `${this.appUrl}/demo/${rawToken}`
        const firstName = name.split(' ')[0] || name
        const location = (target.location as string | null) || ''
        const painPoint = PAIN_POINT_MAP[name] || ''
        const isTeamLead = TEAM_LEADS.has(name)

        const emailSent = await this.sendPilotOutreachEmail(email, targetId, {
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

        const { error: touchpointError } = await this.db
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
          this.logger.error(`[outreach/blast] Failed to record touchpoint for ${targetId}:`, touchpointError)
        }

        const { error: updateError } = await this.db
          .from('pilot_recruitment_targets')
          .update({ status: 'contacted' })
          .eq('id', targetId)

        if (updateError) {
          this.logger.error(`[outreach/blast] Failed to update target status for ${targetId}:`, updateError)
        }

        sent++
      } catch (err: any) {
        this.logger.error(`[outreach/blast] Unexpected error for target ${targetId}:`, err)
        errors.push(`${name} (${email}): unexpected error`)
      }
    }

    this.logger.info(`[outreach/blast] Blast complete: sent=${sent}, skipped=${skipped}, errors=${errors.length}`)
    return { sent, skipped, errors }
  }

  async getStats(): Promise<{ identified: number; contacted: number; responded: number; signed_up: number; total: number }> {
    const { data: targets, error } = await this.db
      .from('pilot_recruitment_targets')
      .select('id,status')

    if (error) {
      this.logger.error('[outreach/blast] Failed to fetch stats:', error)
      throw new Error('Failed to fetch stats')
    }

    const all = targets ?? []
    return {
      identified: all.filter((t: any) => t.status === 'identified').length,
      contacted: all.filter((t: any) => t.status === 'contacted').length,
      responded: all.filter((t: any) => t.status === 'responded').length,
      signed_up: all.filter((t: any) => t.status === 'signed_up').length,
      total: all.length,
    }
  }
}
