import { NextRequest, NextResponse } from 'next/server'
import {
  getMessagesPerDay,
  getDeliveryStats,
  getResponseRate,
  getSequenceCompletion,
  getLeadConversion,
  getAvgResponseTime,
} from '@/lib/analytics-queries'
import { validateSession } from '@/lib/session'

export async function GET(request: NextRequest) {
  try {
    // ── Auth ─────────────────────────────────────────────────────────────
    // API routes are excluded from the Next.js middleware matcher so we
    // must validate the session manually here.
    const sessionToken = request.cookies.get('leadflow_session')?.value
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = await validateSession(sessionToken)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // session.userId is the authenticated agent's ID — used for scoped queries
    const agentId = session.userId

    const searchParams = request.nextUrl.searchParams
    const daysBack = parseInt(searchParams.get('days') || '30', 10)

    // Validate days parameter
    if (isNaN(daysBack) || daysBack < 1 || daysBack > 365) {
      return NextResponse.json(
        { error: 'Invalid days parameter. Must be between 1 and 365.' },
        { status: 400 }
      )
    }

    // Fetch all metrics in parallel
    const [msgPerDay, delivery, response, sequence, conversion, respTime] = await Promise.all([
      getMessagesPerDay(daysBack),
      getDeliveryStats(daysBack),
      getResponseRate(daysBack),
      getSequenceCompletion(daysBack),
      getLeadConversion(daysBack),
      getAvgResponseTime(daysBack),
    ])

    // Check for any errors
    const errors = [
      msgPerDay.error,
      delivery.error,
      response.error,
      sequence.error,
      conversion.error,
      respTime.error,
    ].filter(Boolean)

    if (errors.length > 0) {
      console.warn('Some analytics queries had errors:', errors)
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          messagesPerDay: msgPerDay.data,
          deliveryStats: {
            sent: delivery.sent,
            delivered: delivery.delivered,
            failed: delivery.failed,
            pending: delivery.pending,
          },
          responseRate: {
            totalSent: response.totalSent,
            totalResponded: response.totalResponded,
            responseRate: response.responseRate,
          },
          sequenceCompletion: {
            started: sequence.started,
            completed: sequence.completed,
            completionRate: sequence.completionRate,
          },
          leadConversion: {
            totalLeads: conversion.totalLeads,
            convertedLeads: conversion.convertedLeads,
            conversionRate: conversion.conversionRate,
          },
          responseTime: {
            avgResponseTime: respTime.avgResponseTime,
            medianResponseTime: respTime.medianResponseTime,
          },
        },
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'private, no-store',
        },
      }
    )
  } catch (error) {
    console.error('Error in analytics dashboard route:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch analytics data',
      },
      { status: 500 }
    )
  }
}
