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

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
let supabase = null;
function getSupabase() {
    if (!supabase) {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (supabaseUrl && supabaseKey) {
            supabase = createClient(supabaseUrl, supabaseKey, {
                auth: { autoRefreshToken: false, persistSession: false }
            });
        }
    }
    return supabase;
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
                console.log(`   ❌ ${operationName} failed with non-retryable error: ${error.message}`);
                throw error;
            }
            
            if (attempt < maxRetries) {
                const delay = calculateBackoffDelay(attempt);
                console.log(`   ⚠️ ${operationName} failed (attempt ${attempt + 1}/${maxRetries + 1}): ${error.message}`);
                console.log(`   ⏳ Retrying in ${delay}ms...`);
                await sleep(delay);
            } else {
                console.log(`   ❌ ${operationName} failed after ${maxRetries + 1} attempts`);
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
        console.warn('⚠️ CAL_WEBHOOK_SECRET not configured - skipping signature verification');
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
        console.error('❌ Webhook signature length mismatch');
        return false;
    }
    
    const isValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(cleanSignature)
    );
    
    if (!isValid) {
        console.error('❌ Webhook signature verification failed');
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

    console.log(`📅 Processing Cal.com webhook: ${eventType}`);

    try {
        switch (eventType) {
            case 'BOOKING_CREATED':
            case 'booking.created':
                await handleBookingCreated(payload);
                break;

            case 'BOOKING_RESCHEDULED':
            case 'booking.rescheduled':
                await handleBookingRescheduled(payload);
                break;

            case 'BOOKING_CANCELLED':
            case 'booking.cancelled':
            case 'BOOKING_REJECTED':
            case 'booking.rejected':
                await handleBookingCancelled(payload);
                break;

            case 'MEETING_ENDED':
            case 'meeting.ended':
                await handleMeetingEnded(payload);
                break;

            default:
                console.log(`ℹ️ Unhandled Cal.com webhook type: ${eventType}`);
        }

        return { received: true, type: eventType, processedAt: new Date().toISOString() };
    } catch (error) {
        console.error(`❌ Error handling Cal.com webhook ${eventType}:`, error.message);
        throw error;
    }
}

/**
 * Handle new booking created
 * @param {Object} booking - Booking data from webhook
 */
async function handleBookingCreated(booking) {
    console.log(`✅ Booking created: ${booking.uid}`);
    
    const attendee = booking.attendees?.[0];
    if (!attendee) {
        console.warn('⚠️ No attendee information in booking');
        return;
    }

    console.log(`   Attendee: ${attendee.name} (${attendee.email})`);
    console.log(`   Start: ${booking.startTime}`);
    console.log(`   Event Type: ${booking.eventType?.slug || booking.eventTypeId}`);

    const db = getSupabase();

    try {
        // 1. Find or create lead with retry
        const leadData = await withRetry(
            () => findOrCreateLead(attendee, db),
            { context: { operation: 'findOrCreateLead', email: attendee.email } },
            'Find or create lead'
        );

        // 2. Find agent based on event type or default with retry
        const agentId = await withRetry(
            () => findAgentForBooking(booking, db),
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

        const { data: createdBooking, error: bookingError } = await withRetry(
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

        console.log(`   Created booking record: ${createdBooking.id}`);

        // 4. Log activity with retry
        await withRetry(
            () => logBookingActivity({
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
            await withRetry(
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
                await sendBookingConfirmationSMS({
                    phone: attendee.phoneNumber || attendee.phone,
                    name: attendee.name,
                    startTime: booking.startTime,
                    meetingUrl: booking.meeting_url,
                    bookingUid: booking.uid
                });
            } catch (smsError) {
                console.warn(`   ⚠️ SMS confirmation failed (non-critical): ${smsError.message}`);
            }
        }

        // 7. Schedule reminders with retry
        await withRetry(
            () => scheduleBookingReminders(createdBooking, db),
            { context: { operation: 'scheduleReminders', bookingId: createdBooking.id } },
            'Schedule booking reminders'
        );

        console.log(`   ✅ Booking processed successfully`);

    } catch (error) {
        console.error('❌ Error handling booking created:', error.message);
        throw error;
    }
}

/**
 * Handle booking rescheduled
 * @param {Object} booking - Booking data from webhook
 */
async function handleBookingRescheduled(booking) {
    console.log(`🔄 Booking rescheduled: ${booking.uid}`);
    console.log(`   New time: ${booking.startTime}`);

    const db = getSupabase();

    try {
        // Get existing booking with retry
        const { data: existingBooking } = await withRetry(
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

        const { data: updatedBooking } = await withRetry(
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
        await withRetry(
            () => logBookingActivity({
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
                await sendRescheduleConfirmationSMS({
                    phone: attendee.phoneNumber || attendee.phone,
                    name: attendee.name,
                    newStartTime: booking.startTime,
                    bookingUid: booking.uid
                });
            } catch (smsError) {
                console.warn(`   ⚠️ Reschedule SMS failed (non-critical): ${smsError.message}`);
            }
        }

        // Reschedule reminders with retry
        if (updatedBooking) {
            await withRetry(
                () => cancelExistingReminders(updatedBooking.id, db),
                { context: { operation: 'cancelReminders', bookingId: updatedBooking.id } },
                'Cancel existing reminders'
            );
            await withRetry(
                () => scheduleBookingReminders(updatedBooking, db),
                { context: { operation: 'scheduleNewReminders', bookingId: updatedBooking.id } },
                'Schedule new reminders'
            );
        }

        console.log(`   ✅ Reschedule processed`);

    } catch (error) {
        console.error('❌ Error handling reschedule:', error.message);
        throw error;
    }
}

/**
 * Handle booking cancelled
 * @param {Object} booking - Booking data from webhook
 */
async function handleBookingCancelled(booking) {
    console.log(`❌ Booking cancelled: ${booking.uid}`);
    console.log(`   Reason: ${booking.cancellationReason || 'No reason provided'}`);

    const db = getSupabase();

    try {
        const attendee = booking.attendees?.[0];

        // Update booking status with retry
        const { data: existingBooking } = await withRetry(
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
        await withRetry(
            () => logBookingActivity({
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
            await withRetry(
                () => cancelExistingReminders(existingBooking.id, db),
                { context: { operation: 'cancelReminders', bookingId: existingBooking.id } },
                'Cancel scheduled reminders'
            );
        }

        console.log(`   ✅ Cancellation processed`);

    } catch (error) {
        console.error('❌ Error handling cancellation:', error.message);
        throw error;
    }
}

/**
 * Handle meeting ended
 * @param {Object} booking - Booking data from webhook
 */
async function handleMeetingEnded(booking) {
    console.log(`🏁 Meeting ended: ${booking.uid}`);

    const db = getSupabase();

    try {
        const attendee = booking.attendees?.[0];

        // Update booking status with retry
        const { data: existingBooking } = await withRetry(
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
        await withRetry(
            () => logBookingActivity({
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
                await triggerPostMeetingFollowUp(existingBooking);
            } catch (followUpError) {
                console.warn(`   ⚠️ Post-meeting follow-up failed (non-critical): ${followUpError.message}`);
            }
        }

        console.log(`   ✅ Meeting completion processed`);

    } catch (error) {
        console.error('❌ Error handling meeting end:', error.message);
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
        console.log(`   Found existing lead: ${existingLead.id}`);
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
        console.warn('Could not create lead:', error.message);
        return null;
    }

    console.log(`   Created new lead: ${newLead.id}`);
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
        .from('agents')
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
        console.warn('Could not log activity:', error.message);
    }
}

/**
 * Send booking confirmation SMS
 */
async function sendBookingConfirmationSMS(bookingData) {
    // TODO: Integrate with Twilio SMS service
    console.log(`📱 Would send booking confirmation SMS to: ${bookingData.phone}`);
    console.log(`   Booking: ${bookingData.startTime}`);
}

/**
 * Send reschedule confirmation SMS
 */
async function sendRescheduleConfirmationSMS(bookingData) {
    console.log(`📱 Would send reschedule confirmation to: ${bookingData.phone}`);
    console.log(`   New time: ${bookingData.newStartTime}`);
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
        console.warn('Could not schedule reminder:', error.message);
    } else {
        console.log(`   Scheduled reminder for ${reminderTime.toISOString()}`);
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
    console.log(`📧 Triggering post-meeting follow-up for booking: ${booking.id}`);
    // TODO: Create follow-up task or trigger sequence
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
            
        if (!verifyWebhookSignature(rawBody, signature || '')) {
            return res.status(401).send('Invalid webhook signature');
        }
    }

    if (!event || (!event.triggerEvent && !event.type)) {
        return res.status(400).send('Invalid webhook payload');
    }

    // Process webhook asynchronously
    handleCalWebhook(event)
        .then(() => res.json({ received: true, processed: true }))
        .catch(err => {
            console.error('Webhook processing error:', err);
            res.status(500).send('Webhook processing failed');
        });
}

module.exports = {
    handleCalWebhook,
    calcomWebhookHandler,
    verifyWebhookSignature,
    
    // Exposed for testing
    handleBookingCreated,
    handleBookingRescheduled,
    handleBookingCancelled,
    handleMeetingEnded,
    
    // Retry utilities for testing
    withRetry,
    sleep,
    calculateBackoffDelay,
    RETRY_CONFIG
};
