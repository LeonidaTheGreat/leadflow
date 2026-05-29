import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/logger'

const DEFAULT_REPORT_DAYS = 30
const MIN_ACTIVE_LEADS_FOR_LOW_VOLUME = 5

type MessageRow = {
  lead_id: string
  direction: 'inbound' | 'outbound'
  created_at: string
}

type LeadRow = {
  id: string
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  status?: string | null
  created_at: string
}

type BookingRow = {
  lead_id: string
  created_at: string
}

function formatLeadName(lead: LeadRow) {
  const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(' ').trim()
  if (fullName) {
    return fullName
  }

  return lead.phone ? `Lead (${lead.phone})` : `Lead ${lead.id.slice(0, 8)}`
}

export class ReportsService {
  constructor(private readonly dbClient: any) {}

  static createDefaultService() {
    return new ReportsService(supabaseAdmin)
  }

  private getStartDate(daysBack: number) {
    return new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString()
  }

  async getSummaryReport(daysBack = DEFAULT_REPORT_DAYS) {
    const startDate = this.getStartDate(daysBack)

    const [leadsRes, messagesRes, bookingsRes] = await Promise.all([
      this.dbClient
        .from('leads')
        .select('id, first_name, last_name, phone, status, created_at')
        .gte('created_at', startDate),
      this.dbClient
        .from('messages')
        .select('lead_id, direction, created_at')
        .gte('created_at', startDate),
      this.dbClient
        .from('bookings')
        .select('lead_id, created_at')
        .gte('created_at', startDate),
    ])

    if (leadsRes.error || messagesRes.error || bookingsRes.error) {
      logger.error('[ReportsService] failed to build summary report', {
        leadsError: leadsRes.error,
        messagesError: messagesRes.error,
        bookingsError: bookingsRes.error,
      })

      return {
        reportRangeDays: daysBack,
        generatedAt: new Date().toISOString(),
        headline: 'Report unavailable due to data fetch error',
        totals: { activeLeads: 0, leadsWithoutReply: 0, bookedLeads: 0 },
        atRiskLeads: [],
        topPerformingLeads: [],
        actionItems: ['Retry report generation after verifying database connectivity'],
        errors: [leadsRes.error, messagesRes.error, bookingsRes.error].filter(Boolean).map(String),
      }
    }

    const leads = (leadsRes.data || []) as LeadRow[]
    const messages = (messagesRes.data || []) as MessageRow[]
    const bookings = (bookingsRes.data || []) as BookingRow[]

    const messagesByLead = new Map<string, MessageRow[]>()
    messages.forEach((message) => {
      if (!messagesByLead.has(message.lead_id)) {
        messagesByLead.set(message.lead_id, [])
      }

      messagesByLead.get(message.lead_id)!.push(message)
    })

    const bookingSet = new Set(bookings.map((booking) => booking.lead_id))

    const scoredLeads = leads.map((lead) => {
      const leadMessages = (messagesByLead.get(lead.id) || []).sort((a, b) => {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      })
      const outboundCount = leadMessages.filter((message) => message.direction === 'outbound').length
      const inboundCount = leadMessages.filter((message) => message.direction === 'inbound').length
      const hasReply = inboundCount > 0
      const isBooked = bookingSet.has(lead.id)

      return {
        id: lead.id,
        name: formatLeadName(lead),
        status: lead.status || 'new',
        outboundCount,
        inboundCount,
        hasReply,
        isBooked,
      }
    })

    const atRiskLeads = scoredLeads
      .filter((lead) => lead.outboundCount > 0 && !lead.hasReply && !lead.isBooked)
      .sort((a, b) => b.outboundCount - a.outboundCount)
      .slice(0, 5)

    const topPerformingLeads = scoredLeads
      .filter((lead) => lead.hasReply || lead.isBooked)
      .sort((a, b) => {
        if (a.isBooked !== b.isBooked) {
          return a.isBooked ? -1 : 1
        }

        return b.inboundCount - a.inboundCount
      })
      .slice(0, 5)

    const totals = {
      activeLeads: scoredLeads.length,
      leadsWithoutReply: scoredLeads.filter((lead) => lead.outboundCount > 0 && !lead.hasReply).length,
      bookedLeads: scoredLeads.filter((lead) => lead.isBooked).length,
    }

    const actionItems: string[] = []
    if (atRiskLeads.length > 0) {
      actionItems.push(`Prioritize follow-up on ${atRiskLeads.length} at-risk leads without replies`)
    }

    if (totals.activeLeads < MIN_ACTIVE_LEADS_FOR_LOW_VOLUME) {
      actionItems.push('Pipeline volume is low — increase lead capture or inbound sourcing this week')
    }

    if (totals.bookedLeads === 0 && totals.activeLeads > 0) {
      actionItems.push('No bookings in this period — audit outreach script and speed-to-lead workflow')
    }

    if (actionItems.length === 0) {
      actionItems.push('Maintain current outreach cadence and monitor lead response quality')
    }

    return {
      reportRangeDays: daysBack,
      generatedAt: new Date().toISOString(),
      headline: `Operational report for last ${daysBack} days`,
      totals,
      atRiskLeads,
      topPerformingLeads,
      actionItems,
      errors: [],
    }
  }
}
