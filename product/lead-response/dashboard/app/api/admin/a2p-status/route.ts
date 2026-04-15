import { NextRequest, NextResponse } from 'next/server'
import { isAdminUser } from '@/lib/services/AuthService'
import { checkSmsDeliveryHealth, getA2pRegistrationStatus } from '@/lib/sms-delivery-monitor'
import { logger } from '@/lib/logger'

/**
 * GET /api/admin/a2p-status
 *
 * Returns A2P 10DLC registration status + current SMS delivery health.
 * Used by the admin dashboard to surface compliance risk to operators.
 */
export async function GET(request: NextRequest) {
  try {
    if (!await isAdminUser(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const [deliveryHealth, registrationStatus] = await Promise.all([
      checkSmsDeliveryHealth(),
      Promise.resolve(getA2pRegistrationStatus()),
    ])

    const riskLevel = getRiskLevel(registrationStatus.status, deliveryHealth.status)

    return NextResponse.json({
      success: true,
      registration: registrationStatus,
      delivery: deliveryHealth,
      riskLevel,
      summary: buildSummary(riskLevel, registrationStatus, deliveryHealth),
    })
  } catch (error: any) {
    logger.error('[a2p-status] Error:', error.message)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

function getRiskLevel(
  regStatus: string,
  deliveryStatus: string
): RiskLevel {
  if (deliveryStatus === 'critical') return 'critical'
  if (deliveryStatus === 'degraded') return 'high'
  if (regStatus === 'not_started') return 'high'
  if (regStatus === 'pending') return 'medium'
  if (regStatus === 'registered') return 'low'
  return 'medium'
}

function buildSummary(
  riskLevel: RiskLevel,
  reg: ReturnType<typeof getA2pRegistrationStatus>,
  delivery: Awaited<ReturnType<typeof checkSmsDeliveryHealth>>
): string {
  if (reg.registered) {
    return 'A2P 10DLC registration complete. SMS delivery operating normally.'
  }
  if (riskLevel === 'critical') {
    return `CRITICAL: SMS delivery at ${delivery.deliveryRate !== null ? Math.round(delivery.deliveryRate * 100) + '%' : 'unknown'} — carrier filtering active. Immediate action required.`
  }
  if (reg.status === 'pending') {
    const daysStr = reg.daysPending !== null ? ` (${reg.daysPending} days so far)` : ''
    return `A2P 10DLC registration pending${daysStr}. SMS delivery may be filtered by carriers. Expected approval: 2-4 weeks from submission.`
  }
  if (reg.status === 'not_started') {
    return 'A2P 10DLC registration not started. SMS delivery to pilots is at risk — start registration in Twilio console immediately.'
  }
  return 'A2P 10DLC registration status unknown. Verify in Twilio console.'
}
