import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/logger'

export class AnalyticsService {
  constructor(dbClient) {
    this.db = dbClient
  }

  static createDefaultService() {
    return new AnalyticsService(supabaseAdmin)
  }

  getStartDate(daysBack = 30) {
    return new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString()
  }

  logError(message, error) {
    logger.error(message, error)
  }

  async getMessagesPerDay(daysBack = 30) {
    const { data, error } = await this.db
      .from('messages')
      .select('created_at, id')
      .eq('direction', 'outbound')
      .gte('created_at', this.getStartDate(daysBack))
      .order('created_at', { ascending: true })

    if (error) {
      this.logError('Error fetching messages per day:', error)
      return { data: [], error }
    }

    const grouped = (data || []).reduce((acc, msg) => {
      const date = new Date(msg.created_at).toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {})

    return {
      data: Object.entries(grouped).map(([date, count]) => ({ date, count })),
      error: null,
    }
  }

  async getDeliveryStats(daysBack = 30) {
    const { data, error } = await this.db
      .from('messages')
      .select('status')
      .eq('direction', 'outbound')
      .gte('created_at', this.getStartDate(daysBack))

    if (error) {
      this.logError('Error fetching delivery stats:', error)
      return { sent: 0, delivered: 0, failed: 0, pending: 0, error }
    }

    const stats = (data || []).reduce(
      (acc, msg) => {
        const status = msg.status || 'pending'
        acc[status] = (acc[status] || 0) + 1
        return acc
      },
      { sent: 0, delivered: 0, failed: 0, pending: 0 }
    )

    return {
      sent: stats.sent || 0,
      delivered: stats.delivered || 0,
      failed: stats.failed || 0,
      pending: stats.pending || 0,
      error: null,
    }
  }

  async getResponseRate(daysBack = 30) {
    const { data: outboundData, error: outboundError } = await this.db
      .from('messages')
      .select('lead_id')
      .eq('direction', 'outbound')
      .gte('created_at', this.getStartDate(daysBack))

    if (outboundError) {
      this.logError('Error fetching outbound messages:', outboundError)
      return { totalSent: 0, totalResponded: 0, responseRate: 0, error: outboundError }
    }

    const leadsMessaged = new Set((outboundData || []).map((message) => message.lead_id))

    if (leadsMessaged.size === 0) {
      return { totalSent: 0, totalResponded: 0, responseRate: 0, error: null }
    }

    const { data: inboundData, error: inboundError } = await this.db
      .from('messages')
      .select('lead_id')
      .eq('direction', 'inbound')
      .gte('created_at', this.getStartDate(daysBack))
      .in('lead_id', Array.from(leadsMessaged))

    if (inboundError) {
      this.logError('Error fetching inbound messages:', inboundError)
      return { totalSent: 0, totalResponded: 0, responseRate: 0, error: inboundError }
    }

    const leadsResponded = new Set((inboundData || []).map((message) => message.lead_id))
    const totalSent = leadsMessaged.size
    const totalResponded = leadsResponded.size
    const responseRate = totalSent > 0 ? (totalResponded / totalSent) * 100 : 0

    return {
      totalSent,
      totalResponded,
      responseRate: Math.round(responseRate * 10) / 10,
      error: null,
    }
  }

  async getSequenceCompletion(daysBack = 30) {
    const startDate = this.getStartDate(daysBack)
    const { data: eventData, error: eventError } = await this.db
      .from('events')
      .select('lead_id, event_data')
      .eq('event_type', 'sequence_started')
      .gte('created_at', startDate)

    if (eventError || !eventData || eventData.length === 0) {
      const { data: leadsData, error: leadsError } = await this.db
        .from('messages')
        .select('lead_id')
        .eq('direction', 'outbound')
        .gte('created_at', startDate)

      if (leadsError || !leadsData) {
        return { started: 0, completed: 0, completionRate: 0, error: leadsError || null }
      }

      const leadMessageCounts = leadsData.reduce((acc, message) => {
        acc[message.lead_id] = (acc[message.lead_id] || 0) + 1
        return acc
      }, {})

      const started = Object.keys(leadMessageCounts).length
      const completed = Object.values(leadMessageCounts).filter((count) => count >= 3).length
      const completionRate = started > 0 ? (completed / started) * 100 : 0

      return {
        started,
        completed,
        completionRate: Math.round(completionRate * 10) / 10,
        error: null,
      }
    }

    const { data: completionEvents, error: completionError } = await this.db
      .from('events')
      .select('lead_id')
      .eq('event_type', 'sequence_completed')
      .gte('created_at', startDate)

    const completedIds = new Set()
    if (!completionError && completionEvents) {
      completionEvents.forEach((event) => completedIds.add(event.lead_id))
    }

    const started = eventData.length
    const completed = completedIds.size
    const completionRate = started > 0 ? (completed / started) * 100 : 0

    return {
      started,
      completed,
      completionRate: Math.round(completionRate * 10) / 10,
      error: null,
    }
  }

  async getLeadConversion(daysBack = 30) {
    const startDate = this.getStartDate(daysBack)
    const { data: leadsData, error: leadsError } = await this.db
      .from('leads')
      .select('id')
      .gte('created_at', startDate)

    if (leadsError || !leadsData) {
      return { totalLeads: 0, convertedLeads: 0, conversionRate: 0, error: leadsError }
    }

    const totalLeads = leadsData.length
    const { data: bookingsData, error: bookingsError } = await this.db
      .from('bookings')
      .select('lead_id')
      .gte('created_at', startDate)

    if (bookingsError) {
      this.logError('Error fetching bookings for lead conversion metric:', bookingsError)
      return { totalLeads, convertedLeads: 0, conversionRate: 0, error: bookingsError }
    }

    const convertedLeads = new Set((bookingsData || []).map((booking) => booking.lead_id)).size
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0

    return {
      totalLeads,
      convertedLeads,
      conversionRate: Math.round(conversionRate * 10) / 10,
      error: null,
    }
  }

  async getAvgResponseTime(daysBack = 30) {
    const { data: messagesData, error } = await this.db
      .from('messages')
      .select('id, lead_id, direction, created_at')
      .gte('created_at', this.getStartDate(daysBack))
      .order('created_at', { ascending: true })

    if (error || !messagesData || messagesData.length === 0) {
      return { avgResponseTime: 0, medianResponseTime: 0, error }
    }

    const responseTimes = []
    const messagesByLead = {}

    messagesData.forEach((message) => {
      if (!messagesByLead[message.lead_id]) {
        messagesByLead[message.lead_id] = []
      }
      messagesByLead[message.lead_id].push(message)
    })

    Object.values(messagesByLead).forEach((messages) => {
      const outbound = messages.find((message) => message.direction === 'outbound')
      const inbound = messages.find((message) => message.direction === 'inbound')

      if (outbound && inbound) {
        const timeDiff =
          new Date(inbound.created_at).getTime() - new Date(outbound.created_at).getTime()
        responseTimes.push(timeDiff)
      }
    })

    if (responseTimes.length === 0) {
      return { avgResponseTime: 0, medianResponseTime: 0, error: null }
    }

    const avg = responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length
    const sorted = responseTimes.sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]

    return {
      avgResponseTime: Math.round(avg / 1000 / 60),
      medianResponseTime: Math.round(median / 1000 / 60),
      error: null,
    }
  }

  async getAnalyticsDashboard(daysBack = 30) {
    const [messagesPerDay, deliveryStats, responseRate, sequenceCompletion, leadConversion, responseTime] =
      await Promise.all([
        this.getMessagesPerDay(daysBack),
        this.getDeliveryStats(daysBack),
        this.getResponseRate(daysBack),
        this.getSequenceCompletion(daysBack),
        this.getLeadConversion(daysBack),
        this.getAvgResponseTime(daysBack),
      ])

    return {
      messagesPerDay,
      deliveryStats,
      responseRate,
      sequenceCompletion,
      leadConversion,
      responseTime,
    }
  }

  async generateSampleAnalyticsData() {
    const now = new Date()
    const daysBack = 30
    const messages = []

    for (let dayOffset = 0; dayOffset < daysBack; dayOffset += 1) {
      const date = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000)
      const dayMessageCount = Math.floor(Math.random() * 50) + 10

      for (let index = 0; index < dayMessageCount; index += 1) {
        const statuses = ['sent', 'delivered', 'failed', 'pending']
        const status = statuses[Math.floor(Math.random() * statuses.length)]

        messages.push({
          lead_id: `lead-${Math.floor(Math.random() * 100)}`,
          direction: 'outbound',
          channel: 'sms',
          message_body: `Sample message ${index}`,
          status,
          created_at: new Date(
            date.getTime() - Math.random() * 24 * 60 * 60 * 1000
          ).toISOString(),
          ai_generated: true,
          ai_confidence: Math.random() * 100,
        })
      }
    }

    const batchSize = 100
    for (let index = 0; index < messages.length; index += batchSize) {
      const batch = messages.slice(index, index + batchSize)
      const { error } = await this.db.from('messages').insert(batch)
      if (error) {
        this.logError('Error inserting sample messages:', error)
      }
    }

    logger.info(`Generated ${messages.length} sample messages`)
  }
}

export const analyticsService = AnalyticsService.createDefaultService()
