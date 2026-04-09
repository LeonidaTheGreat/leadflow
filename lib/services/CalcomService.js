'use strict';

/**
 * CalcomService
 * Consolidates Cal.com API client, webhook handler, and webhook management.
 *
 * Sources merged:
 *   - lib/calcom.js              → API client
 *   - lib/calcom-webhook-handler.js  → booking event processing
 *   - lib/calcom-webhook-management.js → webhook CRUD + delivery logging
 */

const axios = require('axios');
const crypto = require('crypto');
const { createClient } = require('../postgrest-client');
const { createLeadSequence } = require('../sequence-service');

const CAL_API_BASE_URL = 'https://api.cal.com/v2';

const RETRY_CONFIG = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2
};

class CalcomService {
    constructor(options = {}) {
        this._apiKey = options.apiKey || null;
        this._webhookSecret = options.webhookSecret || null;
        this._username = options.username || null;
        this._db = options.db || null;
        this.retryConfig = { ...RETRY_CONFIG, ...options.retryConfig };
        this.CAL_API_BASE_URL = CAL_API_BASE_URL;
        this.RETRY_CONFIG = this.retryConfig;
    }

    get apiKey() {
        return this._apiKey || process.env.CAL_API_KEY || null;
    }

    get webhookSecret() {
        return this._webhookSecret || process.env.CAL_WEBHOOK_SECRET || null;
    }

    get username() {
        return this._username || process.env.CAL_USERNAME || null;
    }

    isConfigured() {
        return !!this.apiKey;
    }

    _getDb() {
        if (this._db) return this._db;
        const url = process.env.NEXT_PUBLIC_API_URL;
        const key = process.env.API_SECRET_KEY || process.env.LEADFLOW_API_KEY;
        if (url && key) {
            this._db = createClient(url, key);
        }
        return this._db;
    }

    // ─── Cal.com API client ───────────────────────────────────────────────────

    async calApiRequest(endpoint, options = {}) {
        if (!this.apiKey) {
            throw new Error('Cal.com API key not configured. Set CAL_API_KEY environment variable.');
        }
        const url = `${CAL_API_BASE_URL}${endpoint}`;
        const headers = {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            ...options.headers
        };
        if (endpoint.includes('/bookings')) {
            headers['cal-api-version'] = '2024-08-13';
        } else if (endpoint.includes('/event-types')) {
            headers['cal-api-version'] = '2024-06-14';
        }
        try {
            const response = await axios({
                url,
                method: options.method || 'GET',
                headers,
                data: options.body,
                params: options.params,
                timeout: 30000
            });
            return response.data;
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message;
            console.error(`❌ Cal.com API request failed: ${endpoint}`, errorMessage);
            const enhancedError = new Error(
                `Cal.com API error: ${error.response?.status || 'Unknown'} - ${errorMessage}`
            );
            enhancedError.status = error.response?.status;
            enhancedError.data = error.response?.data;
            throw enhancedError;
        }
    }

    async getEventTypes(filters = {}) {
        if (!this.isConfigured()) {
            console.warn('Cal.com not configured - returning mock data');
            return this._getMockEventTypes();
        }
        try {
            const params = {};
            if (filters.username) params.username = filters.username;
            if (filters.eventSlug) params.eventSlug = filters.eventSlug;
            if (filters.orgSlug) params.orgSlug = filters.orgSlug;
            const data = await this.calApiRequest('/event-types', { params });
            const eventTypes = data.data || data.eventTypes || [];
            return eventTypes.map(et => ({
                id: et.id,
                slug: et.slug,
                title: et.title,
                description: et.description,
                duration: et.length,
                bookingUrl: et.link || this.generateBookingUrl(et.slug, filters.username),
                isActive: !et.hidden,
                requiresConfirmation: et.requiresConfirmation,
                disableGuests: et.disableGuests,
                slotInterval: et.slotInterval,
                minimumBookingNotice: et.minimumBookingNotice,
                bufferTime: et.bufferTime,
                color: et.eventTypeColor,
                teamId: et.teamId,
                owner: et.owner,
                metadata: et.metadata
            }));
        } catch (error) {
            console.error('Error fetching event types:', error.message);
            if (process.env.NODE_ENV !== 'production') return this._getMockEventTypes();
            throw error;
        }
    }

    async getEventType(eventTypeId) {
        if (!this.isConfigured()) {
            const mock = this._getMockEventTypes().find(et => et.id === eventTypeId);
            return mock || this._getMockEventTypes()[0];
        }
        const data = await this.calApiRequest(`/event-types/${eventTypeId}`);
        return data.data || data;
    }

    generateBookingUrl(eventSlug, username) {
        const calUsername = username || this._username || process.env.CAL_USERNAME;
        if (!calUsername) {
            console.warn('CAL_USERNAME not configured - cannot generate booking URL');
            return null;
        }
        return `https://cal.com/${calUsername}/${eventSlug}`;
    }

    async getAvailableSlots(params) {
        if (!this.isConfigured()) {
            console.warn('Cal.com not configured - returning mock slots');
            return this._getMockSlots();
        }
        if (!params.start || !params.end) throw new Error('Start and end dates are required');
        const queryParams = { start: params.start, end: params.end };
        if (params.eventTypeId) {
            queryParams.eventTypeId = params.eventTypeId;
        } else if (params.eventTypeSlug && params.username) {
            queryParams.eventTypeSlug = params.eventTypeSlug;
            queryParams.username = params.username;
        } else {
            throw new Error('Must provide either eventTypeId or both eventTypeSlug and username');
        }
        if (params.timeZone) queryParams.timeZone = params.timeZone;
        if (params.duration) queryParams.duration = params.duration;
        return this.calApiRequest('/slots', { params: queryParams });
    }

    async createBooking(bookingData) {
        if (!this.isConfigured()) {
            console.warn('Cal.com not configured - returning mock booking');
            return this._getMockBooking(bookingData);
        }
        const payload = {
            eventTypeId: bookingData.eventTypeId,
            start: bookingData.start,
            attendee: {
                name: bookingData.attendee.name,
                email: bookingData.attendee.email,
                ...(bookingData.attendee.phoneNumber && { phoneNumber: bookingData.attendee.phoneNumber }),
                ...(bookingData.attendee.timeZone && { timeZone: bookingData.attendee.timeZone })
            },
            instant: false,
            metadata: bookingData.metadata || {}
        };
        if (bookingData.location) payload.location = bookingData.location;
        return this.calApiRequest('/bookings', { method: 'POST', body: payload });
    }

    async getBooking(bookingId) {
        if (!this.isConfigured()) return this._getMockBooking({ id: bookingId });
        return this.calApiRequest(`/bookings/${bookingId}`);
    }

    async cancelBooking(bookingId, options = {}) {
        if (!this.isConfigured()) {
            console.log('Mock: Booking cancelled');
            return { id: bookingId, status: 'cancelled', mock: true };
        }
        return this.calApiRequest(`/bookings/${bookingId}/cancel`, {
            method: 'POST',
            body: { reason: options.reason || 'Cancelled by user' }
        });
    }

    async rescheduleBooking(bookingId, rescheduleData) {
        if (!this.isConfigured()) {
            console.log('Mock: Booking rescheduled');
            return { id: bookingId, status: 'rescheduled', startTime: rescheduleData.start, mock: true };
        }
        return this.calApiRequest(`/bookings/${bookingId}/reschedule`, {
            method: 'POST',
            body: { start: rescheduleData.start, reason: rescheduleData.reason }
        });
    }

    async getMe() {
        if (!this.isConfigured()) {
            return { username: this.username || 'mock_user', mock: true };
        }
        try {
            return await this.calApiRequest('/me');
        } catch (error) {
            return { username: this.username, error: error.message };
        }
    }

    async getTeamMembers() {
        if (!this.isConfigured()) return [];
        try {
            const data = await this.calApiRequest('/teams');
            return data.data || [];
        } catch (error) {
            console.warn('Could not fetch team members:', error.message);
            return [];
        }
    }

    // ─── Retry utilities ─────────────────────────────────────────────────────

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    calculateBackoffDelay(attempt) {
        const exponentialDelay = RETRY_CONFIG.baseDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt);
        const cappedDelay = Math.min(exponentialDelay, RETRY_CONFIG.maxDelayMs);
        const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);
        return Math.floor(cappedDelay + jitter);
    }

    async withRetry(fn, options = {}, operationName = 'operation') {
        const maxRetries = options.maxRetries ?? RETRY_CONFIG.maxRetries;
        let lastError;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                if (error.code === 'PGRST116' || error.code === '23503' ||
                    error.code === '23505' || error.status === 400 ||
                    error.status === 401 || error.status === 403) {
                    console.log(`   ❌ ${operationName} failed with non-retryable error: ${error.message}`);
                    throw error;
                }
                if (attempt < maxRetries) {
                    const delay = this.calculateBackoffDelay(attempt);
                    console.log(`   ⚠️ ${operationName} failed (attempt ${attempt + 1}/${maxRetries + 1}): ${error.message}`);
                    console.log(`   ⏳ Retrying in ${delay}ms...`);
                    await this.sleep(delay);
                } else {
                    console.log(`   ❌ ${operationName} failed after ${maxRetries + 1} attempts`);
                }
            }
        }
        throw lastError;
    }

    // ─── Webhook signature verification ──────────────────────────────────────

    verifyWebhookSignature(payload, signature) {
        const secret = this.webhookSecret;
        if (!secret) {
            console.warn('⚠️ CAL_WEBHOOK_SECRET not configured - skipping signature verification');
            return process.env.NODE_ENV !== 'production';
        }
        const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
        const expectedSignature = crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
        const cleanSignature = signature.replace('sha256=', '');
        if (expectedSignature.length !== cleanSignature.length) {
            console.error('❌ Webhook signature length mismatch');
            return false;
        }
        const isValid = crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(cleanSignature));
        if (!isValid) console.error('❌ Webhook signature verification failed');
        return isValid;
    }

    // ─── Webhook event dispatch ───────────────────────────────────────────────

    async handleCalWebhook(event) {
        const eventType = event.triggerEvent || event.type;
        const payload = event.payload || event.data;
        console.log(`📅 Processing Cal.com webhook: ${eventType}`);
        try {
            switch (eventType) {
                case 'BOOKING_CREATED':
                case 'booking.created':
                    await this.handleBookingCreated(payload); break;
                case 'BOOKING_RESCHEDULED':
                case 'booking.rescheduled':
                    await this.handleBookingRescheduled(payload); break;
                case 'BOOKING_CANCELLED':
                case 'booking.cancelled':
                case 'BOOKING_REJECTED':
                case 'booking.rejected':
                    await this.handleBookingCancelled(payload); break;
                case 'MEETING_ENDED':
                case 'meeting.ended':
                    await this.handleMeetingEnded(payload); break;
                default:
                    console.log(`ℹ️ Unhandled Cal.com webhook type: ${eventType}`);
            }
            return { received: true, type: eventType, processedAt: new Date().toISOString() };
        } catch (error) {
            console.error(`❌ Error handling Cal.com webhook ${eventType}:`, error.message);
            throw error;
        }
    }

    calcomWebhookHandler(req, res) {
        const signature = req.headers['x-cal-signature-256'] ||
                         req.headers['cal-signature-256'] ||
                         req.headers['cal-signature'];
        let event;
        if (req.body && typeof req.body === 'string') {
            try { event = JSON.parse(req.body); } catch (e) {
                return res.status(400).send('Invalid JSON payload');
            }
        } else {
            event = req.body;
        }
        if (process.env.NODE_ENV === 'production') {
            const rawBody = req.body && typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
            if (!this.verifyWebhookSignature(rawBody, signature || '')) {
                return res.status(401).send('Invalid webhook signature');
            }
        }
        if (!event || (!event.triggerEvent && !event.type)) {
            return res.status(400).send('Invalid webhook payload');
        }
        this.handleCalWebhook(event)
            .then(() => res.json({ received: true, processed: true }))
            .catch(err => { console.error('Webhook processing error:', err); res.status(500).send('Webhook processing failed'); });
    }

    // ─── Booking event handlers ───────────────────────────────────────────────

    async handleBookingCreated(booking) {
        console.log(`✅ Booking created: ${booking.uid}`);
        const attendee = booking.attendees?.[0];
        if (!attendee) { console.warn('⚠️ No attendee information in booking'); return; }
        console.log(`   Attendee: ${attendee.name} (${attendee.email})`);
        console.log(`   Start: ${booking.startTime}`);
        console.log(`   Event Type: ${booking.eventType?.slug || booking.eventTypeId}`);
        const db = this._getDb();
        try {
            const leadData = await this.withRetry(() => this._findOrCreateLead(attendee, db), {}, 'Find or create lead');
            const agentId = await this.withRetry(() => this._findAgentForBooking(booking, db), {}, 'Find agent for booking');
            const bookingRecord = {
                calcom_booking_id: String(booking.id),
                cal_booking_uid: booking.uid,
                calcom_event_type_id: String(booking.eventTypeId),
                attendee_email: attendee.email,
                attendee_name: attendee.name,
                title: booking.title,
                notes: booking.description,
                start_time: booking.startTime,
                end_time: booking.endTime,
                status: 'confirmed',
                location: booking.location,
                meeting_link: booking.metadata?.videoCallUrl || booking.videoCallData?.url,
                lead_id: leadData?.id,
                agent_id: agentId,
                metadata: { ...booking.metadata, cal_event_type_slug: booking.eventType?.slug, attendee_phone: attendee.phoneNumber || attendee.phone, attendee_timezone: attendee.timeZone, source: 'cal.com', raw_webhook: booking },
                source: 'cal.com'
            };
            const { data: createdBooking, error: bookingError } = await this.withRetry(async () => {
                const result = await db.from('bookings').upsert(bookingRecord, { onConflict: 'cal_booking_uid' }).select().single();
                if (result.error) throw result.error;
                return result;
            }, {}, 'Create booking record');
            if (bookingError) throw bookingError;
            console.log(`   Created booking record: ${createdBooking.id}`);
            await this.withRetry(() => this._logBookingActivity({ bookingId: createdBooking.id, leadEmail: attendee.email, leadName: attendee.name, action: 'booking_created', eventTypeId: booking.eventTypeId, eventTypeSlug: booking.eventType?.slug, startTime: booking.startTime, status: 'booked', newData: bookingRecord }, db), {}, 'Log booking activity');
            if (leadData?.id) {
                await this.withRetry(async () => {
                    const result = await db.from('leads').update({ status: 'appointment_scheduled', updated_at: new Date().toISOString(), metadata: { ...leadData.metadata, last_booking_uid: booking.uid, last_booking_date: booking.startTime } }).eq('id', leadData.id);
                    if (result.error) throw result.error;
                    return result;
                }, {}, 'Update lead status');
            }
            if (attendee.phoneNumber || attendee.phone) {
                try { await this._sendBookingConfirmationSMS({ phone: attendee.phoneNumber || attendee.phone, name: attendee.name, startTime: booking.startTime, meetingUrl: booking.meeting_url, bookingUid: booking.uid }); }
                catch (smsError) { console.warn(`   ⚠️ SMS confirmation failed (non-critical): ${smsError.message}`); }
            }
            await this.withRetry(() => this._scheduleBookingReminders(createdBooking, db), {}, 'Schedule booking reminders');
            console.log(`   ✅ Booking processed successfully`);
        } catch (error) {
            console.error('❌ Error handling booking created:', error.message);
            throw error;
        }
    }

    async handleBookingRescheduled(booking) {
        console.log(`🔄 Booking rescheduled: ${booking.uid}`);
        console.log(`   New time: ${booking.startTime}`);
        const db = this._getDb();
        try {
            const { data: existingBooking } = await this.withRetry(async () => {
                const result = await db.from('bookings').select('*').eq('cal_booking_uid', booking.uid).single();
                if (result.error && result.error.code !== 'PGRST116') throw result.error;
                return result;
            }, {}, 'Get existing booking');
            const attendee = booking.attendees?.[0];
            const updates = { start_time: booking.startTime, end_time: booking.endTime, status: 'rescheduled', reschedule_count: (existingBooking?.reschedule_count || 0) + 1, updated_at: new Date().toISOString() };
            const { data: updatedBooking } = await this.withRetry(async () => {
                const result = await db.from('bookings').update(updates).eq('cal_booking_uid', booking.uid).select().single();
                if (result.error) throw result.error;
                return result;
            }, {}, 'Update booking record');
            await this.withRetry(() => this._logBookingActivity({ bookingId: updatedBooking?.id || existingBooking?.id, leadEmail: attendee?.email, leadName: attendee?.name, action: 'booking_rescheduled', eventTypeId: booking.eventTypeId, eventTypeSlug: booking.eventType?.slug, startTime: booking.startTime, status: 'rescheduled', previousData: existingBooking, newData: updates }, db), {}, 'Log reschedule activity');
            if (attendee?.phoneNumber || attendee?.phone) {
                try { await this._sendRescheduleConfirmationSMS({ phone: attendee.phoneNumber || attendee.phone, name: attendee.name, newStartTime: booking.startTime, bookingUid: booking.uid }); }
                catch (smsError) { console.warn(`   ⚠️ Reschedule SMS failed (non-critical): ${smsError.message}`); }
            }
            if (updatedBooking) {
                await this.withRetry(() => this._cancelExistingReminders(updatedBooking.id, db), {}, 'Cancel existing reminders');
                await this.withRetry(() => this._scheduleBookingReminders(updatedBooking, db), {}, 'Schedule new reminders');
            }
            console.log(`   ✅ Reschedule processed`);
        } catch (error) {
            console.error('❌ Error handling reschedule:', error.message);
            throw error;
        }
    }

    async handleBookingCancelled(booking) {
        console.log(`❌ Booking cancelled: ${booking.uid}`);
        console.log(`   Reason: ${booking.cancellationReason || 'No reason provided'}`);
        const db = this._getDb();
        try {
            const attendee = booking.attendees?.[0];
            const { data: existingBooking } = await this.withRetry(async () => {
                const result = await db.from('bookings').update({ status: 'cancelled', cancellation_reason: booking.cancellationReason, cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('cal_booking_uid', booking.uid).select().single();
                if (result.error && result.error.code !== 'PGRST116') throw result.error;
                return result;
            }, {}, 'Cancel booking');
            await this.withRetry(() => this._logBookingActivity({ bookingId: existingBooking?.id, leadEmail: attendee?.email, leadName: attendee?.name, action: 'booking_cancelled', eventTypeId: booking.eventTypeId, status: 'cancelled', previousData: { status: 'booked' }, newData: { status: 'cancelled', reason: booking.cancellationReason } }, db), {}, 'Log cancellation activity');
            if (existingBooking) {
                await this.withRetry(() => this._cancelExistingReminders(existingBooking.id, db), {}, 'Cancel scheduled reminders');
            }
            // UC-8: Trigger no_show sequence if booking was cancelled (missed appointment)
            if (existingBooking?.lead_id) {
                try {
                    await createLeadSequence({ lead_id: existingBooking.lead_id, sequence_type: 'no_show', trigger_reason: 'missed_appointment', metadata: { cal_booking_id: existingBooking.id, cal_booking_uid: booking.uid, cancellation_reason: booking.cancellationReason || null, triggered_by: 'BOOKING_CANCELLED' } });
                } catch (seqError) {
                    console.warn(`   ⚠️ no_show sequence creation failed (non-critical): ${seqError.message}`);
                }
            }
            console.log(`   ✅ Cancellation processed`);
        } catch (error) {
            console.error('❌ Error handling cancellation:', error.message);
            throw error;
        }
    }

    async handleMeetingEnded(booking) {
        console.log(`🏁 Meeting ended: ${booking.uid}`);
        const db = this._getDb();
        try {
            const attendee = booking.attendees?.[0];
            const { data: existingBooking } = await this.withRetry(async () => {
                const result = await db.from('bookings').update({ status: 'completed', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('cal_booking_uid', booking.uid).select().single();
                if (result.error && result.error.code !== 'PGRST116') throw result.error;
                return result;
            }, {}, 'Complete booking');
            await this.withRetry(() => this._logBookingActivity({ bookingId: existingBooking?.id, leadEmail: attendee?.email, leadName: attendee?.name, action: 'meeting_completed', eventTypeId: booking.eventTypeId, status: 'completed' }, db), {}, 'Log completion activity');
            if (existingBooking?.lead_id) {
                try { await this._triggerPostMeetingFollowUp(existingBooking); }
                catch (followUpError) { console.warn(`   ⚠️ Post-meeting follow-up failed (non-critical): ${followUpError.message}`); }
            }
            console.log(`   ✅ Meeting completion processed`);
        } catch (error) {
            console.error('❌ Error handling meeting end:', error.message);
            throw error;
        }
    }

    // ─── Private booking helpers ──────────────────────────────────────────────

    async _findOrCreateLead(attendee, db) {
        if (!db) return null;
        const { data: existingLead } = await db.from('leads').select('*').eq('email', attendee.email).maybeSingle();
        if (existingLead) { console.log(`   Found existing lead: ${existingLead.id}`); return existingLead; }
        const { data: newLead, error } = await db.from('leads').insert({ email: attendee.email, name: attendee.name, phone: attendee.phoneNumber || attendee.phone, source: 'cal.com', status: 'new', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }).select().single();
        if (error) { console.warn('Could not create lead:', error.message); return null; }
        console.log(`   Created new lead: ${newLead.id}`);
        return newLead;
    }

    async _findAgentForBooking(booking, db) {
        if (!db) return null;
        const { data: config } = await db.from('agent_booking_configs').select('agent_id').eq('cal_event_type_slug', booking.eventType?.slug).eq('is_active', true).maybeSingle();
        if (config) return config.agent_id;
        const { data: defaultAgent } = await db.from('real_estate_agents').select('id').eq('is_default', true).maybeSingle();
        return defaultAgent?.id || null;
    }

    async _logBookingActivity(activityData, db) {
        if (!db) return;
        const { error } = await db.from('booking_activities').insert({ booking_id: activityData.bookingId, lead_email: activityData.leadEmail, lead_name: activityData.leadName, action: activityData.action, event_type_id: activityData.eventTypeId, event_type_slug: activityData.eventTypeSlug, start_time: activityData.startTime, status: activityData.status, previous_data: activityData.previousData, new_data: activityData.newData, created_at: new Date().toISOString() });
        if (error) console.warn('Could not log activity:', error.message);
    }

    async _sendBookingConfirmationSMS(bookingData) {
        // TODO: Integrate with Twilio SMS service
        console.log(`📱 Would send booking confirmation SMS to: ${bookingData.phone}`);
        console.log(`   Booking: ${bookingData.startTime}`);
    }

    async _sendRescheduleConfirmationSMS(bookingData) {
        console.log(`📱 Would send reschedule confirmation to: ${bookingData.phone}`);
        console.log(`   New time: ${bookingData.newStartTime}`);
    }

    async _scheduleBookingReminders(booking, db) {
        if (!db) return;
        const { data: config } = await db.from('agent_booking_configs').select('send_reminder_sms, reminder_hours_before').eq('agent_id', booking.agent_id).maybeSingle();
        if (!config?.send_reminder_sms) return;
        const reminderHours = config.reminder_hours_before || 24;
        const startTime = new Date(booking.start_time);
        const reminderTime = new Date(startTime.getTime() - (reminderHours * 60 * 60 * 1000));
        const { error } = await db.from('booking_reminders').insert({ booking_id: booking.id, reminder_type: 'sms', scheduled_for: reminderTime.toISOString(), status: 'pending', created_at: new Date().toISOString() });
        if (error) console.warn('Could not schedule reminder:', error.message);
        else console.log(`   Scheduled reminder for ${reminderTime.toISOString()}`);
    }

    async _cancelExistingReminders(bookingId, db) {
        if (!db) return;
        await db.from('booking_reminders').update({ status: 'cancelled' }).eq('booking_id', bookingId).eq('status', 'pending');
    }

    async _triggerPostMeetingFollowUp(booking) {
        console.log(`📧 Triggering post-meeting follow-up for booking: ${booking.id}`);
        if (!booking.lead_id) {
            console.warn('⚠️  triggerPostMeetingFollowUp: no lead_id on booking, skipping sequence creation');
            return;
        }
        // UC-8: Create post_viewing sequence after meeting ends (4h follow-up)
        await createLeadSequence({ lead_id: booking.lead_id, sequence_type: 'post_viewing', trigger_reason: 'meeting_ended', metadata: { cal_booking_id: booking.id, cal_booking_uid: booking.cal_booking_uid, triggered_by: 'MEETING_ENDED' } });
    }

    // ─── Webhook management ───────────────────────────────────────────────────

    async listWebhooks() {
        const db = this._getDb();
        if (!db) return this._getMockWebhooks();
        try {
            const { data, error } = await db.from('webhook_configs').select('*').eq('source', 'cal.com').order('created_at', { ascending: false });
            if (error) throw error;
            return (data || []).map(w => ({ id: w.id, webhookId: w.webhook_id, subscriberUrl: w.subscriber_url, eventTriggers: w.event_triggers || [], active: w.active, secret: w.secret ? '***masked***' : null, createdAt: w.created_at, lastFiredAt: w.last_fired_at, failureCount: w.failure_count || 0, metadata: w.metadata }));
        } catch (error) {
            console.error('Error listing webhooks:', error.message);
            if (process.env.NODE_ENV !== 'production') return this._getMockWebhooks();
            throw error;
        }
    }

    async registerWebhook(config) {
        const db = this._getDb();
        if (!db) throw new Error('Database not configured');
        if (!config.subscriberUrl) throw new Error('subscriberUrl is required');
        if (!config.eventTriggers || !Array.isArray(config.eventTriggers) || config.eventTriggers.length === 0) throw new Error('eventTriggers must be a non-empty array');
        try { new URL(config.subscriberUrl); } catch (e) { throw new Error('Invalid subscriberUrl format'); }
        const secret = this.generateWebhookSecret();
        const webhookId = `wh_${crypto.randomBytes(16).toString('hex')}`;
        const webhookData = { webhook_id: webhookId, source: 'cal.com', subscriber_url: config.subscriberUrl, event_triggers: config.eventTriggers, active: config.active !== false, secret, failure_count: 0, metadata: { ...config.metadata, registered_at: new Date().toISOString(), registered_by: config.registeredBy || 'system' }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        try {
            const { data, error } = await db.from('webhook_configs').insert(webhookData).select().single();
            if (error) throw error;
            return { success: true, webhook: { id: data.id, webhookId: data.webhook_id, subscriberUrl: data.subscriber_url, eventTriggers: data.event_triggers, active: data.active, secret, createdAt: data.created_at }, message: 'Webhook registered successfully' };
        } catch (error) {
            console.error('Error registering webhook:', error.message);
            throw error;
        }
    }

    async deleteWebhook(webhookId) {
        const db = this._getDb();
        if (!db) throw new Error('Database not configured');
        try {
            const { error } = await db.from('webhook_configs').delete().eq('webhook_id', webhookId);
            if (error) throw error;
            return { success: true, webhookId, deletedAt: new Date().toISOString() };
        } catch (error) {
            console.error('Error deleting webhook:', error.message);
            throw error;
        }
    }

    async updateWebhook(webhookId, updates) {
        const db = this._getDb();
        if (!db) throw new Error('Database not configured');
        const allowedUpdates = {};
        if (updates.active !== undefined) allowedUpdates.active = updates.active;
        if (updates.eventTriggers !== undefined) allowedUpdates.event_triggers = updates.eventTriggers;
        if (updates.subscriberUrl !== undefined) {
            try { new URL(updates.subscriberUrl); } catch (e) { throw new Error('Invalid subscriberUrl format'); }
            allowedUpdates.subscriber_url = updates.subscriberUrl;
        }
        if (updates.metadata !== undefined) allowedUpdates.metadata = updates.metadata;
        allowedUpdates.updated_at = new Date().toISOString();
        try {
            const { data, error } = await db.from('webhook_configs').update(allowedUpdates).eq('webhook_id', webhookId).select().single();
            if (error) throw error;
            return { success: true, webhook: { id: data.id, webhookId: data.webhook_id, subscriberUrl: data.subscriber_url, eventTriggers: data.event_triggers, active: data.active, updatedAt: data.updated_at } };
        } catch (error) {
            console.error('Error updating webhook:', error.message);
            throw error;
        }
    }

    async getWebhook(webhookId) {
        const db = this._getDb();
        if (!db) {
            const mock = this._getMockWebhooks().find(w => w.webhookId === webhookId);
            if (!mock) throw new Error('Webhook not found');
            return { success: true, webhook: mock };
        }
        try {
            const { data, error } = await db.from('webhook_configs').select('*').eq('webhook_id', webhookId).single();
            if (error) throw error;
            if (!data) throw new Error('Webhook not found');
            return { success: true, webhook: { id: data.id, webhookId: data.webhook_id, subscriberUrl: data.subscriber_url, eventTriggers: data.event_triggers, active: data.active, secret: data.secret ? '***masked***' : null, createdAt: data.created_at, updatedAt: data.updated_at, lastFiredAt: data.last_fired_at, failureCount: data.failure_count, metadata: data.metadata } };
        } catch (error) {
            console.error('Error getting webhook:', error.message);
            if (process.env.NODE_ENV !== 'production' && webhookId.startsWith('wh_mock')) {
                const mock = this._getMockWebhooks().find(w => w.webhookId === webhookId);
                if (mock) return { success: true, webhook: mock };
            }
            if (error.message.includes('not found') || error.message.includes('Not found')) throw new Error('Webhook not found');
            throw error;
        }
    }

    async logWebhookDelivery(logData) {
        const db = this._getDb();
        if (!db) { console.log('📤 Webhook delivery logged (mock):', logData.eventType, logData.status); return; }
        try {
            await db.from('webhook_delivery_logs').insert({ webhook_id: logData.webhookId, event_type: logData.eventType, payload: logData.payload, status: logData.status, http_status: logData.httpStatus, response_body: logData.responseBody, error_message: logData.errorMessage, attempt_number: logData.attemptNumber || 1, duration_ms: logData.durationMs, created_at: new Date().toISOString() });
            if (logData.webhookId) {
                const updates = { last_fired_at: new Date().toISOString() };
                if (logData.status === 'failed') await db.rpc('increment_webhook_failure', { p_webhook_id: logData.webhookId });
                else if (logData.status === 'success') updates.failure_count = 0;
                await db.from('webhook_configs').update(updates).eq('webhook_id', logData.webhookId);
            }
        } catch (error) {
            console.error('Error logging webhook delivery:', error.message);
        }
    }

    async getWebhookDeliveryLogs(filters = {}) {
        const db = this._getDb();
        if (!db) return this._getMockDeliveryLogs();
        try {
            let query = db.from('webhook_delivery_logs').select('*').order('created_at', { ascending: false });
            if (filters.webhookId) query = query.eq('webhook_id', filters.webhookId);
            if (filters.eventType) query = query.eq('event_type', filters.eventType);
            if (filters.status) query = query.eq('status', filters.status);
            if (filters.startDate) query = query.gte('created_at', filters.startDate);
            if (filters.endDate) query = query.lte('created_at', filters.endDate);
            query = query.limit(filters.limit || 100);
            const { data, error } = await query;
            if (error) throw error;
            return (data || []).map(log => ({ id: log.id, webhookId: log.webhook_id, eventType: log.event_type, status: log.status, httpStatus: log.http_status, attemptNumber: log.attempt_number, durationMs: log.duration_ms, errorMessage: log.error_message, createdAt: log.created_at }));
        } catch (error) {
            console.error('Error getting webhook logs:', error.message);
            if (process.env.NODE_ENV !== 'production') return this._getMockDeliveryLogs();
            throw error;
        }
    }

    async getWebhookStats(webhookId, dateRange = {}) {
        const db = this._getDb();
        if (!db) return this._getMockStats();
        try {
            let query = db.from('webhook_delivery_logs').select('status', { count: 'exact' });
            if (webhookId) query = query.eq('webhook_id', webhookId);
            if (dateRange.startDate) query = query.gte('created_at', dateRange.startDate);
            if (dateRange.endDate) query = query.lte('created_at', dateRange.endDate);
            const { data, error, count } = await query;
            if (error) throw error;
            const total = count || 0;
            const successful = data?.filter(d => d.status === 'success').length || 0;
            const failed = data?.filter(d => d.status === 'failed').length || 0;
            const retrying = data?.filter(d => d.status === 'retrying').length || 0;
            return { total, successful, failed, retrying, successRate: total > 0 ? Math.round((successful / total) * 100) : 0, failureRate: total > 0 ? Math.round((failed / total) * 100) : 0 };
        } catch (error) {
            console.error('Error getting webhook stats:', error.message);
            if (process.env.NODE_ENV !== 'production') return this._getMockStats();
            throw error;
        }
    }

    async testWebhook(webhookId) {
        const db = this._getDb();
        if (!db) return { success: true, mock: true, message: 'Test webhook sent (mock)', webhookId };
        try {
            const { data: webhook, error } = await db.from('webhook_configs').select('*').eq('webhook_id', webhookId).single();
            if (error || !webhook) throw new Error('Webhook not found');
            const testPayload = { triggerEvent: 'TEST_EVENT', payload: { test: true, timestamp: new Date().toISOString(), message: 'This is a test webhook from LeadFlow' } };
            const startTime = Date.now();
            try {
                const signature = crypto.createHmac('sha256', webhook.secret).update(JSON.stringify(testPayload)).digest('hex');
                const response = await axios.post(webhook.subscriber_url, testPayload, { headers: { 'Content-Type': 'application/json', 'x-cal-signature-256': signature, 'x-webhook-test': 'true' }, timeout: 10000 });
                const duration = Date.now() - startTime;
                await this.logWebhookDelivery({ webhookId, eventType: 'TEST_EVENT', payload: testPayload, status: 'success', httpStatus: response.status, attemptNumber: 1, durationMs: duration });
                return { success: true, webhookId, httpStatus: response.status, durationMs: duration, message: 'Test webhook delivered successfully' };
            } catch (error) {
                const duration = Date.now() - startTime;
                await this.logWebhookDelivery({ webhookId, eventType: 'TEST_EVENT', payload: testPayload, status: 'failed', httpStatus: error.response?.status, errorMessage: error.message, attemptNumber: 1, durationMs: duration });
                return { success: false, webhookId, httpStatus: error.response?.status, error: error.message, message: 'Test webhook failed' };
            }
        } catch (error) {
            console.error('Error testing webhook:', error.message);
            throw error;
        }
    }

    generateWebhookSecret() {
        return `whsec_${crypto.randomBytes(32).toString('hex')}`;
    }

    // ─── Mock data ────────────────────────────────────────────────────────────

    _getMockEventTypes() {
        return [
            { id: 1, slug: 'discovery-call', title: 'Discovery Call', description: '15-minute introductory call', duration: 15, bookingUrl: `https://cal.com/${process.env.CAL_USERNAME || 'demo'}/discovery-call`, isActive: true, requiresConfirmation: false, disableGuests: false, slotInterval: 15, minimumBookingNotice: 60, bufferTime: 0, mock: true },
            { id: 2, slug: 'property-tour', title: 'Property Tour', description: '30-minute property viewing', duration: 30, bookingUrl: `https://cal.com/${process.env.CAL_USERNAME || 'demo'}/property-tour`, isActive: true, requiresConfirmation: true, disableGuests: false, slotInterval: 30, minimumBookingNotice: 1440, bufferTime: 15, mock: true },
            { id: 3, slug: 'consultation', title: 'Full Consultation', description: '60-minute consultation', duration: 60, bookingUrl: `https://cal.com/${process.env.CAL_USERNAME || 'demo'}/consultation`, isActive: true, requiresConfirmation: true, disableGuests: true, slotInterval: 60, minimumBookingNotice: 2880, bufferTime: 30, mock: true },
            { id: 4, slug: 'buyer-consultation', title: 'Buyer Consultation', description: '45-minute buyer consultation', duration: 45, bookingUrl: `https://cal.com/${process.env.CAL_USERNAME || 'demo'}/buyer-consultation`, isActive: true, requiresConfirmation: false, disableGuests: false, slotInterval: 45, minimumBookingNotice: 720, bufferTime: 15, mock: true },
            { id: 5, slug: 'seller-consultation', title: 'Seller Consultation', description: '45-minute seller consultation', duration: 45, bookingUrl: `https://cal.com/${process.env.CAL_USERNAME || 'demo'}/seller-consultation`, isActive: true, requiresConfirmation: false, disableGuests: false, slotInterval: 45, minimumBookingNotice: 720, bufferTime: 15, mock: true }
        ];
    }

    _getMockSlots() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        const slots = [];
        for (let i = 0; i < 8; i++) {
            slots.push({ time: new Date(tomorrow.getTime() + i * 60 * 60 * 1000).toISOString(), available: true });
        }
        return { slots, mock: true };
    }

    _getMockBooking(bookingData) {
        const duration = bookingData.duration || 30;
        const startTime = bookingData.start || new Date().toISOString();
        const endTime = new Date(new Date(startTime).getTime() + duration * 60 * 1000).toISOString();
        return { id: bookingData.id || `mock_booking_${Date.now()}`, uid: `mock_uid_${Date.now()}`, status: 'accepted', startTime, endTime, attendee: bookingData.attendee || { name: 'Test User', email: 'test@example.com' }, eventTypeId: bookingData.eventTypeId || 1, metadata: bookingData.metadata || {}, mock: true };
    }

    _getMockWebhooks() {
        return [{ id: 'mock-1', webhookId: 'wh_mock_001', subscriberUrl: 'https://example.com/webhook/calcom', eventTriggers: ['BOOKING_CREATED', 'BOOKING_CANCELLED'], active: true, secret: '***masked***', createdAt: new Date(Date.now() - 86400000).toISOString(), lastFiredAt: new Date(Date.now() - 3600000).toISOString(), failureCount: 0, metadata: { mock: true } }];
    }

    _getMockDeliveryLogs() {
        return [{ id: 'mock-log-1', webhookId: 'wh_mock_001', eventType: 'BOOKING_CREATED', status: 'success', httpStatus: 200, attemptNumber: 1, durationMs: 150, createdAt: new Date().toISOString() }];
    }

    _getMockStats() {
        return { total: 150, successful: 145, failed: 3, retrying: 2, successRate: 97, failureRate: 2 };
    }
}

// ─── Singleton + named exports ────────────────────────────────────────────────

const calcomService = new CalcomService();

// Bind middleware so it can be passed directly as a route handler
calcomService.calcomWebhookHandler = calcomService.calcomWebhookHandler.bind(calcomService);

module.exports = calcomService;
module.exports.CalcomService = CalcomService;
module.exports.RETRY_CONFIG = RETRY_CONFIG;
module.exports.CAL_API_BASE_URL = CAL_API_BASE_URL;
