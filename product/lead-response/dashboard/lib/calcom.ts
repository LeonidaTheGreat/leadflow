import axios from 'axios'
import type { Booking, CalcomBooking, CalcomEventType, Lead, Agent } from '@/lib/types'

// ============================================
// CAL.COM API CLIENT
// ============================================

const CALCOM_API_KEY = process.env.CALCOM_API_KEY
const CALCOM_BASE_URL = process.env.CALCOM_BASE_URL || 'https://api.cal.com/v1'
const CALCOM_EVENT_TYPE_ID = process.env.CALCOM_EVENT_TYPE_ID

const calcomClient = axios.create({
  baseURL: CALCOM_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add API key to all requests
if (CALCOM_API_KEY) {
  calcomClient.interceptors.request.use((config) => {
    config.params = { ...config.params, apiKey: CALCOM_API_KEY }
    return config
  })
} else {
  console.warn('⚠️  CALCOM_API_KEY not set - booking integration disabled')
}

// ============================================
// BOOKING LINK GENERATION
// ============================================

export interface BookingLinkOptions {
  agentUsername: string
  leadName?: string
  leadEmail?: string
  leadPhone?: string
  eventTypeSlug?: string
  startTime?: string
  duration?: number
}

/**
 * Generate a Cal.com booking link for a lead
 */
export function generateBookingLink(options: BookingLinkOptions): string {
  const { agentUsername, leadName, leadEmail, leadPhone, eventTypeSlug } = options

  const baseUrl = process.env.NEXT_PUBLIC_CALCOM_URL || 'https://cal.com'
  const path = eventTypeSlug 
    ? `${agentUsername}/${eventTypeSlug}`
    : agentUsername

  const params = new URLSearchParams()
  if (leadName) params.set('name', leadName)
  if (leadEmail) params.set('email', leadEmail)
  if (leadPhone) params.set('phone', leadPhone)
  
  // Add UTM tracking
  params.set('utm_source', 'ai-lead-response')
  params.set('utm_medium', 'sms')

  const queryString = params.toString()
  return `${baseUrl}/${path}${queryString ? '?' + queryString : ''}`
}

/**
 * Get booking link for agent + lead
 */
export function getAgentBookingLink(agent: Agent, lead?: Lead): string {
  if (!agent.calcom_username) {
    throw new Error('Agent does not have a Cal.com username configured')
  }

  return generateBookingLink({
    agentUsername: agent.calcom_username,
    leadName: lead?.name || undefined,
    leadEmail: lead?.email || undefined,
    leadPhone: lead?.phone || undefined,
  })
}

// ============================================
// BOOKING OPERATIONS
// ============================================

/**
 * Create a booking via Cal.com API
 */
export async function createBooking(
  eventTypeId: number,
  data: {
    start: string
    end: string
    name: string
    email: string
    phone?: string
    notes?: string
    timeZone?: string
  }
): Promise<CalcomBooking | null> {
  if (!CALCOM_API_KEY) return null

  try {
    const response = await calcomClient.post('/bookings', {
      eventTypeId,
      ...data,
    })

    console.log('✅ Booking created:', response.data.uid)
    return response.data
  } catch (error: any) {
    console.error('❌ Cal.com create booking error:', error.message)
    return null
  }
}

/**
 * Get booking by UID
 */
export async function getBooking(uid: string): Promise<CalcomBooking | null> {
  if (!CALCOM_API_KEY) return null

  try {
    const response = await calcomClient.get(`/bookings/${uid}`)
    return response.data
  } catch (error: any) {
    console.error('❌ Cal.com get booking error:', error.message)
    return null
  }
}

/**
 * Cancel a booking
 */
export async function cancelBooking(
  uid: string,
  reason?: string
): Promise<boolean> {
  if (!CALCOM_API_KEY) return false

  try {
    await calcomClient.delete(`/bookings/${uid}`, {
      data: { reason },
    })

    console.log('✅ Booking cancelled:', uid)
    return true
  } catch (error: any) {
    console.error('❌ Cal.com cancel booking error:', error.message)
    return false
  }
}

/**
 * Reschedule a booking
 */
export async function rescheduleBooking(
  uid: string,
  newStart: string,
  newEnd: string
): Promise<CalcomBooking | null> {
  if (!CALCOM_API_KEY) return null

  try {
    const response = await calcomClient.patch(`/bookings/${uid}`, {
      start: newStart,
      end: newEnd,
    })

    console.log('✅ Booking rescheduled:', uid)
    return response.data
  } catch (error: any) {
    console.error('❌ Cal.com reschedule error:', error.message)
    return null
  }
}

// ============================================
// AVAILABILITY CHECKING
// ============================================

export interface AvailabilitySlot {
  start: string
  end: string
}

/**
 * Get available time slots for an event type
 */
export async function getAvailability(
  eventTypeId: number,
  dateFrom: string,
  dateTo: string
): Promise<AvailabilitySlot[]> {
  if (!CALCOM_API_KEY) return []

  try {
    const response = await calcomClient.get('/availability', {
      params: {
        eventTypeId,
        dateFrom,
        dateTo,
      },
    })

    return response.data.slots || []
  } catch (error: any) {
    console.error('❌ Cal.com availability error:', error.message)
    return []
  }
}

/**
 * Get next available slot
 */
export async function getNextAvailableSlot(
  eventTypeId: number,
  daysAhead: number = 7
): Promise<AvailabilitySlot | null> {
  const dateFrom = new Date().toISOString()
  const dateTo = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString()

  const slots = await getAvailability(eventTypeId, dateFrom, dateTo)
  return slots.length > 0 ? slots[0] : null
}

// ============================================
// EVENT TYPE OPERATIONS
// ============================================

/**
 * Get event types for a user
 */
export async function getEventTypes(username: string): Promise<CalcomEventType[]> {
  if (!CALCOM_API_KEY) return []

  try {
    const response = await calcomClient.get('/event-types', {
      params: { username },
    })

    return response.data.event_types || []
  } catch (error: any) {
    console.error('❌ Cal.com get event types error:', error.message)
    return []
  }
}

/**
 * Get a specific event type
 */
export async function getEventType(id: number): Promise<CalcomEventType | null> {
  if (!CALCOM_API_KEY) return null

  try {
    const response = await calcomClient.get(`/event-types/${id}`)
    return response.data
  } catch (error: any) {
    console.error('❌ Cal.com get event type error:', error.message)
    return null
  }
}

// ============================================
// BOOKING WEBHOOK HANDLING
// ============================================

export type CalcomWebhookEvent = 
  | 'BOOKING_CREATED'
  | 'BOOKING_RESCHEDULED'
  | 'BOOKING_CANCELLED'
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_REJECTED'
  | 'MEETING_ENDED'

export interface CalcomWebhookPayload {
  triggerEvent: CalcomWebhookEvent
  payload: {
    type: string
    title: string
    description: string | null
    startTime: string
    endTime: string
    attendees: Array<{
      email: string
      name: string
      timeZone: string
      phoneNumber?: string
    }>
    organizer: {
      email: string
      name: string
      timeZone: string
    }
    uid: string
    bookingId: number
    eventTypeId: number
    status: string
    metadata: Record<string, any>
  }
}

/**
 * Verify Cal.com webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const crypto = require('crypto')
  
  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  return hash === signature
}

/**
 * Parse Cal.com webhook payload
 */
export function parseWebhookPayload(body: any): CalcomWebhookPayload | null {
  if (!body.triggerEvent || !body.payload) {
    return null
  }

  return body as CalcomWebhookPayload
}

/**
 * Handle Cal.com booking webhook
 */
export async function handleBookingWebhook(
  payload: CalcomWebhookPayload
): Promise<{
  success: boolean
  action: string
  bookingData?: Partial<Booking>
}> {
  const { triggerEvent, payload: data } = payload

  console.log('📅 Cal.com webhook:', triggerEvent, '- Booking:', data.bookingId)

  const bookingData: Partial<Booking> = {
    calcom_booking_id: String(data.bookingId),
    calcom_event_type_id: String(data.eventTypeId),
    start_time: data.startTime,
    end_time: data.endTime,
    status: mapCalcomStatus(data.status),
    meeting_link: data.metadata?.videoCallUrl || null,
    notes: data.description,
    metadata: {
      title: data.title,
      attendees: data.attendees,
      organizer: data.organizer,
      uid: data.uid,
    },
  }

  switch (triggerEvent) {
    case 'BOOKING_CREATED':
      return {
        success: true,
        action: 'booking_created',
        bookingData,
      }

    case 'BOOKING_CONFIRMED':
      return {
        success: true,
        action: 'booking_confirmed',
        bookingData: { ...bookingData, status: 'confirmed' },
      }

    case 'BOOKING_RESCHEDULED':
      return {
        success: true,
        action: 'booking_rescheduled',
        bookingData,
      }

    case 'BOOKING_CANCELLED':
      return {
        success: true,
        action: 'booking_cancelled',
        bookingData: { ...bookingData, status: 'cancelled' },
      }

    case 'MEETING_ENDED':
      return {
        success: true,
        action: 'booking_completed',
        bookingData: { ...bookingData, status: 'completed' },
      }

    default:
      return {
        success: false,
        action: 'unknown',
      }
  }
}

/**
 * Map Cal.com status to internal status
 */
function mapCalcomStatus(calcomStatus: string): Booking['status'] {
  const statusMap: Record<string, Booking['status']> = {
    'ACCEPTED': 'confirmed',
    'PENDING': 'pending',
    'CANCELLED': 'cancelled',
    'REJECTED': 'cancelled',
  }
  return statusMap[calcomStatus] || 'pending'
}

// ============================================
// BOOKING REMINDERS
// ============================================

/**
 * Generate booking confirmation message
 */
export function generateConfirmationMessage(
  booking: CalcomBooking,
  agentName: string
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

  return `Confirmed! Your appointment with ${agentName} is scheduled for ${dateStr} at ${timeStr}. Meeting link will be sent shortly. Reply STOP to opt out.`
}

/**
 * Generate booking reminder message
 */
export function generateReminderMessage(
  booking: CalcomBooking,
  agentName: string,
  hoursBefore: number
): string {
  const startDate = new Date(booking.startTime)
  const timeStr = startDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  return `Reminder: You have an appointment with ${agentName} in ${hoursBefore} hours at ${timeStr}. See you soon! Reply STOP to opt out.`
}
