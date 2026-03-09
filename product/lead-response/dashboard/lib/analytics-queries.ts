/**
 * Analytics Queries for KPI Dashboard
 * All queries include sample data generation for testing
 */

import { supabaseAdmin } from '@/lib/supabase'
import type { Message, Lead, Booking } from '@/lib/types'

// ============================================
// METRIC 1: MESSAGES SENT PER DAY
// ============================================

export async function getMessagesPerDay(daysBack: number = 30) {
  const { data, error } = await supabaseAdmin
    .from('messages')
    .select('created_at, id')
    .eq('direction', 'outbound')
    .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching messages per day:', error)
    return { data: [], error }
  }

  // Group by date
  const grouped = (data || []).reduce(
    (acc: Record<string, number>, msg: any) => {
      const date = new Date(msg.created_at).toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + 1
      return acc
    },
    {}
  )

  const result = Object.entries(grouped).map(([date, count]) => ({
    date,
    count,
  }))

  return { data: result, error: null }
}

// ============================================
// METRIC 2: DELIVERY SUCCESS RATE
// ============================================

export async function getDeliveryStats(daysBack: number = 30) {
  const { data, error } = await supabaseAdmin
    .from('messages')
    .select('status')
    .eq('direction', 'outbound')
    .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())

  if (error) {
    console.error('Error fetching delivery stats:', error)
    return { sent: 0, delivered: 0, failed: 0, pending: 0, error }
  }

  const stats = (data || []).reduce(
    (acc: Record<string, number>, msg: any) => {
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

// ============================================
// METRIC 3: RESPONSE RATE
// ============================================

export async function getResponseRate(daysBack: number = 30) {
  // Get messages sent (outbound)
  const { data: outboundData, error: outboundError } = await supabaseAdmin
    .from('messages')
    .select('lead_id')
    .eq('direction', 'outbound')
    .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())

  if (outboundError) {
    console.error('Error fetching outbound messages:', outboundError)
    return { totalSent: 0, totalResponded: 0, responseRate: 0, error: outboundError }
  }

  // Get unique leads we messaged
  const leadsMsgd = new Set((outboundData || []).map((m: any) => m.lead_id))

  if (leadsMsgd.size === 0) {
    return { totalSent: 0, totalResponded: 0, responseRate: 0, error: null }
  }

  // Get inbound responses from those leads
  const { data: inboundData, error: inboundError } = await supabaseAdmin
    .from('messages')
    .select('lead_id')
    .eq('direction', 'inbound')
    .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())
    .in('lead_id', Array.from(leadsMsgd))

  if (inboundError) {
    console.error('Error fetching inbound messages:', inboundError)
    return { totalSent: 0, totalResponded: 0, responseRate: 0, error: inboundError }
  }

  // Get unique leads that responded
  const leadsResponded = new Set((inboundData || []).map((m: any) => m.lead_id))

  const totalSent = leadsMsgd.size
  const totalResponded = leadsResponded.size
  const responseRate = totalSent > 0 ? (totalResponded / totalSent) * 100 : 0

  return {
    totalSent,
    totalResponded,
    responseRate: Math.round(responseRate * 10) / 10, // 1 decimal place
    error: null,
  }
}

// ============================================
// METRIC 4: FOLLOW-UP SEQUENCE COMPLETION
// ============================================

export async function getSequenceCompletion(daysBack: number = 30) {
  // Get all sequences (from events or a sequences table if exists)
  const { data: eventData, error: eventError } = await supabaseAdmin
    .from('events')
    .select('lead_id, event_data')
    .eq('event_type', 'sequence_started')
    .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())

  if (eventError || !eventData || eventData.length === 0) {
    // Fallback: use leads with multiple messages as proxy for sequences
    const { data: leadsData, error: leadsError } = await supabaseAdmin
      .from('messages')
      .select('lead_id')
      .eq('direction', 'outbound')
      .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())

    if (leadsError || !leadsData) {
      return { started: 0, completed: 0, completionRate: 0, error: leadsError || null }
    }

    // Count leads with multiple messages (active sequences)
    const leadMsgCounts = (leadsData as any[]).reduce(
      (acc: Record<string, number>, msg: any) => {
        acc[msg.lead_id] = (acc[msg.lead_id] || 0) + 1
        return acc
      },
      {}
    )

    const started = Object.keys(leadMsgCounts).length
    const completed = Object.values(leadMsgCounts).filter((count: any) => count >= 3).length

    const completionRate = started > 0 ? (completed / started) * 100 : 0

    return {
      started,
      completed,
      completionRate: Math.round(completionRate * 10) / 10,
      error: null,
    }
  }

  const started = eventData.length
  const completedIds = new Set<string>()

  // Check for sequence completion events
  const { data: completionEvents, error: completionError } = await supabaseAdmin
    .from('events')
    .select('lead_id')
    .eq('event_type', 'sequence_completed')
    .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())

  if (!completionError && completionEvents) {
    completionEvents.forEach((e: any) => completedIds.add(e.lead_id))
  }

  const completed = completedIds.size
  const completionRate = started > 0 ? (completed / started) * 100 : 0

  return {
    started,
    completed,
    completionRate: Math.round(completionRate * 10) / 10,
    error: null,
  }
}

// ============================================
// METRIC 5: LEAD CONVERSION RATE
// ============================================

export async function getLeadConversion(daysBack: number = 30) {
  const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString()

  // Get total leads in period
  const { data: leadsData, error: leadsError } = await supabaseAdmin
    .from('leads')
    .select('id')
    .gte('created_at', startDate)

  if (leadsError || !leadsData) {
    return { totalLeads: 0, convertedLeads: 0, conversionRate: 0, error: leadsError }
  }

  const totalLeads = leadsData.length

  // Get bookings (conversions) in period
  const { data: bookingsData, error: bookingsError } = await supabaseAdmin
    .from('bookings')
    .select('lead_id')
    .gte('created_at', startDate)

  if (bookingsError) {
    return { totalLeads, convertedLeads: 0, conversionRate: 0, error: bookingsError }
  }

  const convertedLeads = new Set((bookingsData || []).map((b: any) => b.lead_id)).size
  const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0

  return {
    totalLeads,
    convertedLeads,
    conversionRate: Math.round(conversionRate * 10) / 10,
    error: null,
  }
}

// ============================================
// METRIC 6: RESPONSE TIME (BONUS)
// ============================================

export async function getAvgResponseTime(daysBack: number = 30) {
  const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString()

  const { data: messagesData, error } = await supabaseAdmin
    .from('messages')
    .select('id, lead_id, direction, created_at')
    .gte('created_at', startDate)
    .order('created_at', { ascending: true })

  if (error || !messagesData || messagesData.length === 0) {
    return { avgResponseTime: 0, medianResponseTime: 0, error }
  }

  // Group by lead and find response times
  const responseTimes: number[] = []
  const msgsByLead: Record<string, any[]> = {}

  ;(messagesData as any[]).forEach((msg) => {
    if (!msgsByLead[msg.lead_id]) {
      msgsByLead[msg.lead_id] = []
    }
    msgsByLead[msg.lead_id].push(msg)
  })

  // Calculate response time for each lead (first inbound after first outbound)
  Object.values(msgsByLead).forEach((msgs) => {
    const outbound = msgs.find((m) => m.direction === 'outbound')
    const inbound = msgs.find((m) => m.direction === 'inbound')

    if (outbound && inbound) {
      const timeDiff =
        new Date(inbound.created_at).getTime() - new Date(outbound.created_at).getTime()
      responseTimes.push(timeDiff)
    }
  })

  if (responseTimes.length === 0) {
    return { avgResponseTime: 0, medianResponseTime: 0, error: null }
  }

  const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
  const sorted = responseTimes.sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]

  return {
    avgResponseTime: Math.round(avg / 1000 / 60), // minutes
    medianResponseTime: Math.round(median / 1000 / 60), // minutes
    error: null,
  }
}

// ============================================
// AGGREGATED DASHBOARD DATA
// ============================================

export async function getAnalyticsDashboard(daysBack: number = 30) {
  const [msgPerDay, delivery, response, sequence, conversion, respTime] = await Promise.all([
    getMessagesPerDay(daysBack),
    getDeliveryStats(daysBack),
    getResponseRate(daysBack),
    getSequenceCompletion(daysBack),
    getLeadConversion(daysBack),
    getAvgResponseTime(daysBack),
  ])

  return {
    messagesPerDay: msgPerDay,
    deliveryStats: delivery,
    responseRate: response,
    sequenceCompletion: sequence,
    leadConversion: conversion,
    responseTime: respTime,
  }
}

// ============================================
// SAMPLE DATA GENERATOR (for testing/demo)
// ============================================

export async function generateSampleAnalyticsData() {
  const now = new Date()
  const daysBack = 30

  // Generate sample messages
  const messages = []
  for (let i = 0; i < daysBack; i++) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const dayMsgCount = Math.floor(Math.random() * 50) + 10

    for (let j = 0; j < dayMsgCount; j++) {
      const statuses = ['sent', 'delivered', 'failed', 'pending']
      const status = statuses[Math.floor(Math.random() * statuses.length)]

      messages.push({
        lead_id: `lead-${Math.floor(Math.random() * 100)}`,
        direction: 'outbound',
        channel: 'sms',
        message_body: `Sample message ${j}`,
        status,
        created_at: new Date(date.getTime() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        ai_generated: true,
        ai_confidence: Math.random() * 100,
      })
    }
  }

  // Insert sample messages (in batches)
  const batchSize = 100
  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize)
    const { error } = await supabaseAdmin.from('messages').insert(batch)
    if (error) console.error('Error inserting sample messages:', error)
  }

  console.log(`Generated ${messages.length} sample messages`)
}
