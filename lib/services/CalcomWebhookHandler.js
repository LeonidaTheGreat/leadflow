/**
 * Cal.com Webhook Handler
 * Processes booking events from Cal.com and updates LeadFlow database
 * 
 * Supported Events:
 * - BOOKING_CREATED
 * - BOOKING_RESCHEDULED
 * - BOOKING_CANCELLED
 * - BOOKING_REJECTED
 * - MEETING_ENDED
 */

const { createClient } = require('../db');
const { createLeadSequence } = require('./SequenceService');
const defaultCreateLeadSequence = createLeadSequence;
const TwilioService = require('./TwilioService');
const { logger } = require('../logger');
const log = logger.child('CalcomWebhookHandler');

const twilioService = new TwilioService();

function getSupabase() {
    if (!this._db) {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const apiKey = process.env.API_SECRET_KEY || process.env.LEADFLOW_API_KEY;

        if (apiUrl && apiKey) {
            this._db = createClient(apiUrl, apiKey);
        }
    }
    return this._db;
}

// Retry configuration
const RETRY_CONFIG = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2
};

/**
 * Sleep utility for async delays
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff and jitter
 * @param {number} attempt - Current attempt number (0-indexed)
 * @returns {number} Delay in milliseconds
 */
function calculateBackoffDelay(attempt) {
    // Exponential backoff: baseDelay * (multiplier ^ attempt)
    const exponentialDelay = RETRY_CONFIG.baseDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt);
    
    // Cap at max delay
    const cappedDelay = Math.min(exponentialDelay, RETRY_CONFIG.maxDelayMs);
    
    // Add jitter (±25%) to prevent thundering herd
    const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);
    
    return Math.floor(cappedDelay + jitter);
}

/**
 * Execute a function with retry logic and exponential backoff
 * @param {Function} fn - Async function to execute
 * @param {Object} options - Retry options
 * @param {string} operationName - Name of operation for logging
 * @returns {Promise<any>} Function result
 */
async function withRetry(fn, options = {}, operationName = 'operation') {
    const maxRetries = options.maxRetries ?? RETRY_CONFIG.maxRetries;
    const context = options.context || {};
    
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            
            // Don't retry on certain error types
            if (error.code === 'PGRST116' || // Not found
                error.code === '23503' ||      // Foreign key violation
                error.code === '23505' ||      // Unique constraint violation
                error.status === 400 ||        // Bad request
                error.status === 401 ||        // Unauthorized
                error.status === 403) {        // Forbidden
                log.info(`   ❌ ${operationName} failed with non-retryable error: ${error.message}`);
                throw error;
            }
            
            if (attempt < maxRetries) {
                const delay = calculateBackoffDelay(attempt);
                log.info(`   ⚠️ ${operationName} failed (attempt ${attempt + 1}/${maxRetries + 1}): ${error.message}`);
                log.info(`   ⏳ Retrying in ${delay}ms...`);
                await sleep(delay);
            } else {
                log.info(`   ❌ ${operationName} failed after ${maxRetries + 1} attempts`);
            }
        }
    }
    
    throw lastError;
}

/**
 * Verify Cal.com webhook signature
 * @param {Object} payload - Webhook payload
 * @param {string} signature - Webhook signature header
 * @returns {boolean} Is valid
 */
function verifyWebhookSignature(payload, signature) {
    const secret = process.env.CAL_WEBHOOK_SECRET;
    
    if (!secret) {
        log.warn('⚠️ CAL_WEBHOOK_SECRET not configured - skipping signature verification');
        return process.env.NODE_ENV !== 'production'; // Skip in dev, require in prod
    }

    // Cal.com uses HMAC-SHA256
    const crypto = require('crypto');
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payloadString)
        .digest('hex');
    
    // Support both raw signature and prefixed versions
    const cleanSignature = signature.replace('sha256=', '');
    
    // Early return if lengths don't match (prevent timingSafeEqual error)
    if (expectedSignature.length !== cleanSignature.length) {
        log.error('❌ Webhook signature length mismatch', null);
        return false;
    }
    
    const isValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(cleanSignature)
    );
    
    if (!isValid) {
        log.error('❌ Webhook signature verification failed', null);
    }
    
    return isValid;
}

/**
 * Handle Cal.com webhook events
 * @param {Object} event - Webhook event object
 * @returns {Promise<Object>} Processing result
 */
async function handleCalWebhook(event) {
    const eventType = event.triggerEvent || event.type;
    const payload = event.payload || event.data;

    log.info(`📅 Processing Cal.com webhook: ${eventType}`);

    try {
        switch (eventType) {
            case 'BOOKING_CREATED':
            case 'booking.created':
                await this.handleBookingCreated(payload);
                break;

            case 'BOOKING_RESCHEDULED':
            case 'booking.rescheduled':
                await this.handleBookingRescheduled(payload);
                break;

            case 'BOOKING_CANCELLED':
            case 'booking.cancelled':
            case 'BOOKING_REJECTED':
            case 'booking.rejected':
                await this.handleBookingCancelled(payload);
                break;

            case 'MEETING_ENDED':
            case 'meeting.ended':
                await this.handleMeetingEnded(payload);
                break;

            default:
                log.info(`ℹ️ Unhandled Cal.com webhook type: ${eventType}`);
        }

        return { received: true, type: eventType, processedAt: new Date().toISOString() };
    } catch (error) {
        log.error(`❌ Error handling Cal.com webhook ${eventType}:`, error);
        throw error;
    }
}

/**
 * Handle new booking created
 * @param {Object} booking - Booking data from webhook
 */
async function handleBookingCreated(booking) {
    log.info(`✅ Booking created: ${booking.uid}`);
    
    const attendee = booking.attendees?.[0];
    if (!attendee) {
        log.warn('⚠️ No attendee information in booking');
        return;
    }

    log.info(`   Attendee: ${attendee.name} (${attendee.email})`);
    log.info(`   Start: ${booking.startTime}`);
    log.info(`   Event Type: ${booking.eventType?.slug || booking.eventTypeId}`);

    const db = this.getDb();

    try {
        // 1. Find or create lead with retry
        const leadData = await this.withRetry(
            () => this.findOrCreateLead(attendee, db),
            { context: { operation: 'findOrCreateLead', email: attendee.email } },
            'Find or create lead'
        );

        // 2. Find agent based on event type or default with retry
        const agentId = await this.withRetry(
            () => this.findAgentForBooking(booking, db),
            { context: { operation: 'findAgentForBooking', eventTypeSlug: booking.eventType?.slug } },
            'Find agent for booking'
        );

        // 3. Create booking record with retry
        // Column names aligned with TypeScript Booking interface and dashboard webhook
        const bookingRecord = {
            calcom_booking_id: String(booking.id),        // was cal_booking_id
            cal_booking_uid: booking.uid,                 // unique uid — used for upsert dedup
            calcom_event_type_id: String(booking.eventTypeId), // was cal_event_type_id
            attendee_email: attendee.email,
            attendee_name: attendee.name,
            title: booking.title,
            notes: booking.description,                   // was description
            start_time: booking.startTime,
            end_time: booking.endTime,
            status: 'confirmed',                          // was 'booked'; schema uses 'confirmed'
            location: booking.location,
            meeting_link: booking.metadata?.videoCallUrl || booking.videoCallData?.url, // was meeting_url
            lead_id: leadData?.id,
            agent_id: agentId,
            metadata: {
                ...booking.metadata,
                cal_event_type_slug: booking.eventType?.slug,
                attendee_phone: attendee.phoneNumber || attendee.phone,
                attendee_timezone: attendee.timeZone,
                source: 'cal.com',
                raw_webhook: booking
            },
            source: 'cal.com'
        };

        const { data: createdBooking, error: bookingError } = await this.withRetry(
            async () => {
                const result = await db
                    .from('bookings')
                    .upsert(bookingRecord, { onConflict: 'cal_booking_uid' })
                    .select()
                    .single();
                
                if (result.error) throw result.error;
                return result;
            },
            { context: { operation: 'upsertBooking', uid: booking.uid } },
            'Create booking record'
        );

        if (bookingError) {
            throw bookingError;
        }

        log.info(`   Created booking record: ${createdBooking.id}`);

        // 4. Log activity with retry
        await this.withRetry(
            () => this.logBookingActivity({
                bookingId: createdBooking.id,
                leadEmail: attendee.email,
                leadName: attendee.name,
                action: 'booking_created',
                eventTypeId: booking.eventTypeId,
                eventTypeSlug: booking.eventType?.slug,
                startTime: booking.startTime,
                status: 'booked',
                newData: bookingRecord
            }, db),
            { context: { operation: 'logBookingActivity', bookingId: createdBooking.id } },
            'Log booking activity'
        );

        // 5. Update lead status with retry
        if (leadData?.id) {
            await this.withRetry(
                async () => {
                    const result = await db.from('leads')
                        .update({
                            status: 'appointment_scheduled',
                            updated_at: new Date().toISOString(),
                            metadata: {
                                ...leadData.metadata,
                                last_booking_uid: booking.uid,
                                last_booking_date: booking.startTime
                            }
                        })
                        .eq('id', leadData.id);
                    
                    if (result.error) throw result.error;
                    return result;
                },
                { context: { operation: 'updateLeadStatus', leadId: leadData.id } },
                'Update lead status'
            );
        }

        // 6. Send confirmation SMS if phone available (no retry - non-critical)
        if (attendee.phoneNumber || attendee.phone) {
            try {
                await this.sendBookingConfirmationSMS({
                    phone: attendee.phoneNumber || attendee.phone,
                    name: attendee.name,
                    startTime: booking.startTime,
                    meetingUrl: booking.meeting_url,
                    bookingUid: booking.uid
                });
            } catch (smsError) {
                log.warn(`   ⚠️ SMS confirmation failed (non-critical): ${smsError.message}`);
            }
        }

        // 7. Schedule reminders with retry
        await this.withRetry(
            () => this.scheduleBookingReminders(createdBooking, db),
            { context: { operation: 'scheduleReminders', bookingId: createdBooking.id } },
            'Schedule booking reminders'
        );

        log.info(`   ✅ Booking processed successfully`);

    } catch (error) {
        log.error('❌ Error handling booking created:', error);
        throw error;
    }
}

/**
 * Handle booking rescheduled
 * @param {Object} booking - Booking data from webhook
 */
async function handleBookingRescheduled(booking) {
    log.info(`🔄 Booking rescheduled: ${booking.uid}`);
    log.info(`   New time: ${booking.startTime}`);

    const db = this.getDb();

    try {
        // Get existing booking with retry
        const { data: existingBooking } = await this.withRetry(
            async () => {
                const result = await db
                    .from('bookings')
                    .select('*')
                    .eq('cal_booking_uid', booking.uid)
                    .single();
                
                if (result.error && result.error.code !== 'PGRST116') throw result.error;
                return result;
            },
            { context: { operation: 'getExistingBooking', uid: booking.uid } },
            'Get existing booking'
        );

        const attendee = booking.attendees?.[0];
        
        // Update booking record with retry
        const updates = {
            start_time: booking.startTime,
            end_time: booking.endTime,
            status: 'rescheduled',
            reschedule_count: (existingBooking?.reschedule_count || 0) + 1,
            updated_at: new Date().toISOString()
        };

        const { data: updatedBooking } = await this.withRetry(
            async () => {
                const result = await db
                    .from('bookings')
                    .update(updates)
                    .eq('cal_booking_uid', booking.uid)
                    .select()
                    .single();
                
                if (result.error) throw result.error;
                return result;
            },
            { context: { operation: 'updateBooking', uid: booking.uid } },
            'Update booking record'
        );

        // Log activity with retry
        await this.withRetry(
            () => this.logBookingActivity({
                bookingId: updatedBooking?.id || existingBooking?.id,
                leadEmail: attendee?.email,
                leadName: attendee?.name,
                action: 'booking_rescheduled',
                eventTypeId: booking.eventTypeId,
                eventTypeSlug: booking.eventType?.slug,
                startTime: booking.startTime,
                status: 'rescheduled',
                previousData: existingBooking,
                newData: updates
            }, db),
            { context: { operation: 'logRescheduleActivity', bookingId: updatedBooking?.id } },
            'Log reschedule activity'
        );

        // Send updated confirmation (no retry - non-critical)
        if (attendee?.phoneNumber || attendee?.phone) {
            try {
                await this.sendRescheduleConfirmationSMS({
                    phone: attendee.phoneNumber || attendee.phone,
                    name: attendee.name,
                    newStartTime: booking.startTime,
                    bookingUid: booking.uid
                });
            } catch (smsError) {
                log.warn(`   ⚠️ Reschedule SMS failed (non-critical): ${smsError.message}`);
            }
        }

        // Reschedule reminders with retry
        if (updatedBooking) {
            await this.withRetry(
                () => this.cancelExistingReminders(updatedBooking.id, db),
                { context: { operation: 'cancelReminders', bookingId: updatedBooking.id } },
                'Cancel existing reminders'
            );
            await this.withRetry(
                () => this.scheduleBookingReminders(updatedBooking, db),
                { context: { operation: 'scheduleNewReminders', bookingId: updatedBooking.id } },
                'Schedule new reminders'
            );
        }

        log.info(`   ✅ Reschedule processed`);

    } catch (error) {
        log.error('❌ Error handling reschedule:', error);
        throw error;
    }
}

/**
 * Handle booking cancelled
 * @param {Object} booking - Booking data from webhook
 */
async function handleBookingCancelled(booking) {
    log.info(`❌ Booking cancelled: ${booking.uid}`);
    log.info(`   Reason: ${booking.cancellationReason || 'No reason provided'}`);

    const db = this.getDb();

    try {
        const attendee = booking.attendees?.[0];

        // Update booking status with retry
        const { data: existingBooking } = await this.withRetry(
            async () => {
                const result = await db
                    .from('bookings')
                    .update({
                        status: 'cancelled',
                        cancellation_reason: booking.cancellationReason,
                        cancelled_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .eq('cal_booking_uid', booking.uid)
                    .select()
                    .single();
                
                if (result.error && result.error.code !== 'PGRST116') throw result.error;
                return result;
            },
            { context: { operation: 'cancelBooking', uid: booking.uid } },
            'Cancel booking'
        );

        // Log activity with retry
        await this.withRetry(
            () => this.logBookingActivity({
                bookingId: existingBooking?.id,
                leadEmail: attendee?.email,
                leadName: attendee?.name,
                action: 'booking_cancelled',
                eventTypeId: booking.eventTypeId,
                status: 'cancelled',
                previousData: { status: 'booked' },
                newData: { status: 'cancelled', reason: booking.cancellationReason }
            }, db),
            { context: { operation: 'logCancellationActivity', bookingId: existingBooking?.id } },
            'Log cancellation activity'
        );

        // Cancel scheduled reminders with retry
        if (existingBooking) {
            await this.withRetry(
                () => this.cancelExistingReminders(existingBooking.id, db),
                { context: { operation: 'cancelReminders', bookingId: existingBooking.id } },
                'Cancel scheduled reminders'
            );
        }

        // UC-8: Trigger no_show sequence if booking was cancelled (missed appointment)
        if (existingBooking?.lead_id) {
            try {
                await this.createLeadSequence({
                    lead_id: existingBooking.lead_id,
                    sequence_type: 'no_show',
                    trigger_reason: 'missed_appointment',
                    metadata: {
                        cal_booking_id: existingBooking.id,
                        cal_booking_uid: booking.uid,
                        cancellation_reason: booking.cancellationReason || null,
                        triggered_by: 'BOOKING_CANCELLED',
                    },
                });
            } catch (seqError) {
                log.warn(`   ⚠️ no_show sequence creation failed (non-critical): ${seqError.message}`);
            }
        }

        log.info(`   ✅ Cancellation processed`);

    } catch (error) {
        log.error('❌ Error handling cancellation:', error);
        throw error;
    }
}

/**
 * Handle meeting ended
 * @param {Object} booking - Booking data from webhook
 */
async function handleMeetingEnded(booking) {
    log.info(`🏁 Meeting ended: ${booking.uid}`);

    const db = this.getDb();

    try {
        const attendee = booking.attendees?.[0];

        // Update booking status with retry
        const { data: existingBooking } = await this.withRetry(
            async () => {
                const result = await db
                    .from('bookings')
                    .update({
                        status: 'completed',
                        completed_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .eq('cal_booking_uid', booking.uid)
                    .select()
                    .single();
                
                if (result.error && result.error.code !== 'PGRST116') throw result.error;
                return result;
            },
            { context: { operation: 'completeBooking', uid: booking.uid } },
            'Complete booking'
        );

        // Log activity with retry
        await this.withRetry(
            () => this.logBookingActivity({
                bookingId: existingBooking?.id,
                leadEmail: attendee?.email,
                leadName: attendee?.name,
                action: 'meeting_completed',
                eventTypeId: booking.eventTypeId,
                status: 'completed'
            }, db),
            { context: { operation: 'logCompletionActivity', bookingId: existingBooking?.id } },
            'Log completion activity'
        );

        // Trigger post-meeting follow-up (no retry - non-critical)
        if (existingBooking?.lead_id) {
            try {
                await this.triggerPostMeetingFollowUp(existingBooking);
            } catch (followUpError) {
                log.warn(`   ⚠️ Post-meeting follow-up failed (non-critical): ${followUpError.message}`);
            }
        }

        log.info(`   ✅ Meeting completion processed`);

    } catch (error) {
        log.error('❌ Error handling meeting end:', error);
        throw error;
    }
}

// ===== HELPER FUNCTIONS =====

/**
 * Find or create lead from attendee data
 */
async function findOrCreateLead(attendee, db) {
    if (!db) return null;

    // Try to find existing lead
    const { data: existingLead } = await db
        .from('leads')
        .select('*')
        .eq('email', attendee.email)
        .maybeSingle();

    if (existingLead) {
        log.info(`   Found existing lead: ${existingLead.id}`);
        return existingLead;
    }

    // Create new lead
    const { data: newLead, error } = await db
        .from('leads')
        .insert({
            email: attendee.email,
            name: attendee.name,
            phone: attendee.phoneNumber || attendee.phone,
            source: 'cal.com',
            status: 'new',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) {
        log.warn('Could not create lead:', null, { error: error.message });
        return null;
    }

    log.info(`   Created new lead: ${newLead.id}`);
    return newLead;
}

/**
 * Find agent associated with booking
 */
async function findAgentForBooking(booking, db) {
    if (!db) return null;

    // Try to find by event type slug
    const { data: config } = await db
        .from('agent_booking_configs')
        .select('agent_id')
        .eq('cal_event_type_slug', booking.eventType?.slug)
        .eq('is_active', true)
        .maybeSingle();

    if (config) {
        return config.agent_id;
    }

    // Fallback: get default agent
    const { data: defaultAgent } = await db
        .from('real_estate_agents')
        .select('id')
        .eq('is_default', true)
        .maybeSingle();

    return defaultAgent?.id || null;
}

/**
 * Log booking activity to audit table
 */
async function logBookingActivity(activityData, db) {
    if (!db) return;

    const { error } = await db
        .from('booking_activities')
        .insert({
            booking_id: activityData.bookingId,
            lead_email: activityData.leadEmail,
            lead_name: activityData.leadName,
            action: activityData.action,
            event_type_id: activityData.eventTypeId,
            event_type_slug: activityData.eventTypeSlug,
            start_time: activityData.startTime,
            status: activityData.status,
            previous_data: activityData.previousData,
            new_data: activityData.newData,
            created_at: new Date().toISOString()
        });

    if (error) {
        log.warn('Could not log activity:', null, { error: error.message });
    }
}

/**
 * Send booking confirmation SMS
 */
async function sendBookingConfirmationSMS(bookingData) {
    if (!bookingData.phone) {
        log.warn('sendBookingConfirmationSMS: no phone number provided, skipping');
        return;
    }

    const startTime = bookingData.startTime
        ? new Date(bookingData.startTime).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
        : 'your scheduled time';

    const message = `Hi ${bookingData.name || 'there'}, your appointment has been confirmed for ${startTime}. Reply STOP to unsubscribe.`;

    await twilioService.sendSms(bookingData.phone, message, { trigger: 'booking_confirmation' });
    log.info(`SMS booking confirmation sent to ***${String(bookingData.phone).slice(-4)}`);
}

/**
 * Send reschedule confirmation SMS
 */
async function sendRescheduleConfirmationSMS(bookingData) {
    if (!bookingData.phone) {
        log.warn('sendRescheduleConfirmationSMS: no phone number provided, skipping');
        return;
    }

    const newStartTime = bookingData.newStartTime
        ? new Date(bookingData.newStartTime).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
        : 'your new scheduled time';

    const message = `Hi ${bookingData.name || 'there'}, your appointment has been rescheduled to ${newStartTime}. Reply STOP to unsubscribe.`;

    await twilioService.sendSms(bookingData.phone, message, { trigger: 'reschedule_confirmation' });
    log.info(`SMS reschedule confirmation sent to ***${String(bookingData.phone).slice(-4)}`);
}

/**
 * Schedule booking reminders
 */
async function scheduleBookingReminders(booking, db) {
    if (!db) return;

    // Get agent config
    const { data: config } = await db
        .from('agent_booking_configs')
        .select('send_reminder_sms, reminder_hours_before')
        .eq('agent_id', booking.agent_id)
        .maybeSingle();

    if (!config?.send_reminder_sms) return;

    const reminderHours = config.reminder_hours_before || 24;
    const startTime = new Date(booking.start_time);
    const reminderTime = new Date(startTime.getTime() - (reminderHours * 60 * 60 * 1000));

    // Schedule reminder
    const { error } = await db
        .from('booking_reminders')
        .insert({
            booking_id: booking.id,
            reminder_type: 'sms',
            scheduled_for: reminderTime.toISOString(),
            status: 'pending',
            created_at: new Date().toISOString()
        });

    if (error) {
        log.warn('Could not schedule reminder:', null, { error: error.message });
    } else {
        log.info(`   Scheduled reminder for ${reminderTime.toISOString()}`);
    }
}

/**
 * Cancel existing reminders for a booking
 */
async function cancelExistingReminders(bookingId, db) {
    if (!db) return;

    await db
        .from('booking_reminders')
        .update({ status: 'cancelled' })
        .eq('booking_id', bookingId)
        .eq('status', 'pending');
}

/**
 * Trigger post-meeting follow-up
 */
async function triggerPostMeetingFollowUp(booking) {
    log.info(`📧 Triggering post-meeting follow-up for booking: ${booking.id}`);

    if (!booking.lead_id) {
        log.warn('⚠️  triggerPostMeetingFollowUp: no lead_id on booking, skipping sequence creation');
        return;
    }

    // UC-8: Create post_viewing sequence after meeting ends (4h follow-up)
    await this.createLeadSequence({
        lead_id: booking.lead_id,
        sequence_type: 'post_viewing',
        trigger_reason: 'meeting_ended',
        metadata: {
            cal_booking_id: booking.id,
            cal_booking_uid: booking.cal_booking_uid,
            triggered_by: 'MEETING_ENDED',
        },
    });
}

/**
 * Express middleware handler for Cal.com webhooks
 */
function calcomWebhookHandler(req, res) {
    const signature = req.headers['x-cal-signature-256'] || 
                     req.headers['cal-signature-256'] ||
                     req.headers['cal-signature'];

    // Parse raw body if needed
    let event;
    if (req.body && typeof req.body === 'string') {
        try {
            event = JSON.parse(req.body);
        } catch (e) {
            return res.status(400).send('Invalid JSON payload');
        }
    } else {
        event = req.body;
    }

    // Verify signature in production
    if (process.env.NODE_ENV === 'production') {
        const rawBody = req.body && typeof req.body === 'string' 
            ? req.body 
            : JSON.stringify(req.body);
            
        if (!this.verifyWebhookSignature(rawBody, signature || '')) {
            return res.status(401).send('Invalid webhook signature');
        }
    }

    if (!event || (!event.triggerEvent && !event.type)) {
        return res.status(400).send('Invalid webhook payload');
    }

    // Process webhook asynchronously
    this.handleCalWebhook(event)
        .then(() => res.json({ received: true, processed: true }))
        .catch(err => {
            log.error('Webhook processing error:', err);
            res.status(500).send('Webhook processing failed');
        });
}

class CalcomWebhookHandler {
    constructor(options = {}) {
        this._db = options.db || null;
        this.createLeadSequence = options.createLeadSequence || defaultCreateLeadSequence;
    }

    getDb() {
        return getSupabase.call(this);
    }

    async handleCalWebhook(event) {
        return handleCalWebhook.call(this, event);
    }

    calcomWebhookHandler(req, res) {
        return calcomWebhookHandler.call(this, req, res);
    }

    verifyWebhookSignature(payload, signature) {
        return verifyWebhookSignature.call(this, payload, signature);
    }

    async handleBookingCreated(booking) {
        return handleBookingCreated.call(this, booking);
    }

    async handleBookingRescheduled(booking) {
        return handleBookingRescheduled.call(this, booking);
    }

    async handleBookingCancelled(booking) {
        return handleBookingCancelled.call(this, booking);
    }

    async handleMeetingEnded(booking) {
        return handleMeetingEnded.call(this, booking);
    }

    async findOrCreateLead(attendee, db) {
        return findOrCreateLead.call(this, attendee, db);
    }

    async findAgentForBooking(booking, db) {
        return findAgentForBooking.call(this, booking, db);
    }

    async logBookingActivity(activityData, db) {
        return logBookingActivity.call(this, activityData, db);
    }

    async sendBookingConfirmationSMS(bookingData) {
        return sendBookingConfirmationSMS.call(this, bookingData);
    }

    async sendRescheduleConfirmationSMS(bookingData) {
        return sendRescheduleConfirmationSMS.call(this, bookingData);
    }

    async scheduleBookingReminders(booking, db) {
        return scheduleBookingReminders.call(this, booking, db);
    }

    async cancelExistingReminders(bookingId, db) {
        return cancelExistingReminders.call(this, bookingId, db);
    }

    async triggerPostMeetingFollowUp(booking) {
        return triggerPostMeetingFollowUp.call(this, booking);
    }

    async withRetry(fn, options = {}, operationName = 'operation') {
        return withRetry.call(this, fn, options, operationName);
    }

    sleep(ms) {
        return sleep(ms);
    }

    calculateBackoffDelay(attempt) {
        return calculateBackoffDelay(attempt);
    }
}

const defaultHandler = new CalcomWebhookHandler();

module.exports = CalcomWebhookHandler;
module.exports.defaultHandler = defaultHandler;
module.exports.RETRY_CONFIG = RETRY_CONFIG;
module.exports.handleCalWebhook = (...args) => defaultHandler.handleCalWebhook(...args);
module.exports.calcomWebhookHandler = (...args) => defaultHandler.calcomWebhookHandler(...args);
module.exports.verifyWebhookSignature = (...args) => defaultHandler.verifyWebhookSignature(...args);
module.exports.handleBookingCreated = (...args) => defaultHandler.handleBookingCreated(...args);
module.exports.handleBookingRescheduled = (...args) => defaultHandler.handleBookingRescheduled(...args);
module.exports.handleBookingCancelled = (...args) => defaultHandler.handleBookingCancelled(...args);
module.exports.handleMeetingEnded = (...args) => defaultHandler.handleMeetingEnded(...args);
module.exports.withRetry = (...args) => defaultHandler.withRetry(...args);
module.exports.sleep = (...args) => defaultHandler.sleep(...args);
module.exports.calculateBackoffDelay = (...args) => defaultHandler.calculateBackoffDelay(...args);
