import { logger } from '@/lib/logger'
import { postgrestAdmin } from '@/lib/db'

export interface CaptureInput {
  email: string
  firstName?: string | null
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  source?: string
}

export interface ProspectRow {
  email: string
  first_name: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  source: string | null
  created_at: string
}

export class ProspectWaitlistService {
  constructor(private readonly db = postgrestAdmin) {}

  async captureProspect(input: CaptureInput): Promise<{ success: boolean; error?: string }> {
    const { email, firstName, utmSource, utmMedium, utmCampaign, source = 'landing-page' } = input

    const { error } = await this.db
      .from('prospect_waitlist')
      .upsert(
        {
          email,
          first_name: firstName ?? null,
          utm_source: utmSource ?? null,
          utm_medium: utmMedium ?? null,
          utm_campaign: utmCampaign ?? null,
          source,
        },
        { onConflict: 'email' }
      )

    if (error) {
      logger.error('[ProspectWaitlistService] captureProspect error', { error: error.message })
      return { success: false, error: error.message }
    }

    return { success: true }
  }

  async getProspects(): Promise<ProspectRow[]> {
    const { data, error } = await this.db
      .from('prospect_waitlist')
      .select('email, first_name, utm_source, utm_medium, utm_campaign, source, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('[ProspectWaitlistService] getProspects error', { error: error.message })
      return []
    }

    return (data as ProspectRow[]) ?? []
  }
}

export const prospectWaitlistService = new ProspectWaitlistService()
