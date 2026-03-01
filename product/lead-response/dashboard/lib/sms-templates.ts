import type { Lead, Agent } from '@/lib/types'

// ============================================
// SMS TEMPLATES FOR CAL.COM BOOKINGS
// ============================================

/**
 * Generate booking confirmation SMS
 */
export function generateBookingConfirmationSMS(
  lead: Lead,
  agent: Agent,
  booking: {
    startTime: string
    meetingLink: string
  }
): string {
  const startDate = new Date(booking.startTime)
  const dateStr = startDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  const timeStr = startDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
  
  return `Hi ${lead.name}! Your appointment with ${agent.name} is confirmed for ${dateStr} at ${timeStr}.\nMeeting link: ${booking.meetingLink}\nReply STOP to opt out.`
}

/**
 * Generate booking rescheduled SMS
 */
export function generateBookingRescheduledSMS(
  lead: Lead,
  agent: Agent,
  booking: {
    startTime: string
    meetingLink: string
  }
): string {
  const startDate = new Date(booking.startTime)
  const dateStr = startDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  const timeStr = startDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
  
  return `Hi ${lead.name}! Your appointment has been rescheduled to ${dateStr} at ${timeStr}.\nNew link: ${booking.meetingLink}\nReply STOP to opt out.`
}

/**
 * Generate booking cancelled SMS
 */
export function generateBookingCancelledSMS(
  lead: Lead,
  agent: Agent,
  booking: {
    startTime: string
  }
): string {
  const startDate = new Date(booking.startTime)
  const dateStr = startDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  
  return `Hi ${lead.name}! Your appointment for ${dateStr} has been cancelled. \nReply here or call us to reschedule.\nReply STOP to opt out.`
}