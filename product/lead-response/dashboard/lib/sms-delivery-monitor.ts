/**
 * SMS Delivery Rate Monitor
 *
 * Detects A2P 10DLC carrier filtering by tracking delivery rate degradation.
 * Carriers begin silently filtering unregistered A2P traffic before returning
 * explicit error codes — a delivery rate drop is the earliest warning signal.
 *
 * Call `checkSmsDeliveryHealth()` from admin monitoring endpoints.
 */

import { createClient } from '@/lib/db'

// Thresholds
const DEGRADED_THRESHOLD = 0.70  // <70% delivery rate = degraded
const CRITICAL_THRESHOLD = 0.50  // <50% delivery rate = critical
const WINDOW_HOURS = 24
const MIN_SAMPLE_SIZE = 5        // Need at least 5 messages to be meaningful

// A2P 10DLC error codes — carrier filtering
const A2P_ERROR_CODES = ['30034', '30007', '30008', '30003', '30006']

export type DeliveryHealthStatus = 'healthy' | 'degraded' | 'critical' | 'insufficient_data' | 'unmonitored'

export interface SmsDeliveryHealth {
  status: DeliveryHealthStatus
  deliveryRate: number | null   // 0-1, null if insufficient data
  totalSent: number
  delivered: number
  failed: number
  a2pBlocked: number            // messages with A2P-specific error codes
  windowHours: number
  checkedAt: string
  alertMessage: string | null
}

/**
 * Check SMS delivery health over the last WINDOW_HOURS.
 * Returns health status and metrics from the messages table.
 */
export async function checkSmsDeliveryHealth(): Promise<SmsDeliveryHealth> {
  const checkedAt = new Date().toISOString()
  const since = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000).toISOString()

  const db = createClient()

  // Fetch outbound SMS in the monitoring window
  const { data: messages, error } = await db
    .from('messages')
    .select('twilio_status, metadata')
    .eq('direction', 'outbound')
    .eq('channel', 'sms')
    .gte('created_at', since)

  if (error) {
    console.error('[sms-delivery-monitor] Failed to fetch messages:', error.message)
    return {
      status: 'unmonitored',
      deliveryRate: null,
      totalSent: 0,
      delivered: 0,
      failed: 0,
      a2pBlocked: 0,
      windowHours: WINDOW_HOURS,
      checkedAt,
      alertMessage: `Monitoring unavailable: ${error.message}`,
    }
  }

  const rows = messages || []
  const totalSent = rows.length

  if (totalSent < MIN_SAMPLE_SIZE) {
    return {
      status: 'insufficient_data',
      deliveryRate: null,
      totalSent,
      delivered: 0,
      failed: 0,
      a2pBlocked: 0,
      windowHours: WINDOW_HOURS,
      checkedAt,
      alertMessage: null,
    }
  }

  let delivered = 0
  let failed = 0
  let a2pBlocked = 0

  for (const msg of rows) {
    const status = msg.twilio_status
    if (status === 'delivered') {
      delivered++
    } else if (status === 'failed' || status === 'undelivered') {
      failed++
      // Check for A2P-specific error codes in metadata
      const errorCode = String(msg.metadata?.error_code || msg.metadata?.errorCode || '')
      if (A2P_ERROR_CODES.includes(errorCode)) {
        a2pBlocked++
      }
    }
  }

  // Only count terminal statuses (delivered + failed) for the rate
  const terminal = delivered + failed
  const deliveryRate = terminal >= MIN_SAMPLE_SIZE ? delivered / terminal : null

  let status: DeliveryHealthStatus = 'healthy'
  let alertMessage: string | null = null

  if (deliveryRate !== null) {
    if (deliveryRate < CRITICAL_THRESHOLD) {
      status = 'critical'
      alertMessage = `CRITICAL: SMS delivery rate ${Math.round(deliveryRate * 100)}% — A2P 10DLC carrier filtering likely active. Complete registration immediately.`
    } else if (deliveryRate < DEGRADED_THRESHOLD) {
      status = 'degraded'
      alertMessage = `WARNING: SMS delivery rate ${Math.round(deliveryRate * 100)}% — below ${Math.round(DEGRADED_THRESHOLD * 100)}% threshold. A2P 10DLC registration pending.`
    }
  }

  if (a2pBlocked > 0 && status === 'healthy') {
    status = 'degraded'
    alertMessage = `WARNING: ${a2pBlocked} message(s) blocked with A2P carrier error codes. Registration required.`
  }

  return {
    status,
    deliveryRate,
    totalSent,
    delivered,
    failed,
    a2pBlocked,
    windowHours: WINDOW_HOURS,
    checkedAt,
    alertMessage,
  }
}

/**
 * Get A2P 10DLC registration status from environment config.
 * Status is manually set via env var until Twilio API polling is implemented.
 */
export function getA2pRegistrationStatus(): {
  registered: boolean
  status: 'registered' | 'pending' | 'not_started' | 'unknown'
  daysPending: number | null
} {
  const status = (process.env.A2P_REGISTRATION_STATUS || 'pending') as string
  const submittedAt = process.env.A2P_REGISTRATION_SUBMITTED_AT

  let daysPending: number | null = null
  if (submittedAt) {
    const submitted = new Date(submittedAt)
    daysPending = Math.floor((Date.now() - submitted.getTime()) / (1000 * 60 * 60 * 24))
  }

  return {
    registered: status === 'registered',
    status: status as 'registered' | 'pending' | 'not_started' | 'unknown',
    daysPending,
  }
}
