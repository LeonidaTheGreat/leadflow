const axios = require('axios');
const crypto = require('crypto');
const { createClient } = require('../db');
const { createLeadSequence } = require('../sequence-service');

const DEFAULT_CAL_API_BASE_URL = 'https://api.cal.com/v2';
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2
};

const SCENARIOS = {
  DISCOVERY: 'discovery-call',
  PROPERTY_TOUR: 'property-tour',
  CONSULTATION: 'consultation',
  PHONE_CALL: 'phone-call',
  MEETING: 'meeting',
  SHOWING: 'property-showing'
};

class CalcomService {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.axiosClient = options.axiosClient || axios;
    this.db = options.db || null;
    this.CAL_API_BASE_URL = options.calApiBaseUrl || DEFAULT_CAL_API_BASE_URL;
    this.RETRY_CONFIG = options.retryConfig || { ...DEFAULT_RETRY_CONFIG };
    this.SCENARIOS = SCENARIOS;
  }

  getDb() {
    if (this.db) {
      return this.db;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const apiKey = process.env.API_SECRET_KEY || process.env.LEADFLOW_API_KEY;

    if (apiUrl && apiKey) {
      this.db = createClient(apiUrl, apiKey);
    }

    return this.db;
  }

  getApiKey() {
    return process.env.CAL_API_KEY || null;
  }

  isConfigured() {
    return !!this.getApiKey();
  }

  async calApiRequest(endpoint, options = {}) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Cal.com API key not configured. Set CAL_API_KEY environment variable.');
    }

    const url = `${this.CAL_API_BASE_URL}${endpoint}`;
    const headers = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (endpoint.includes('/bookings')) {
      headers['cal-api-version'] = '2024-08-13';
    } else if (endpoint.includes('/event-types')) {
      headers['cal-api-version'] = '2024-06-14';
    }

    try {
      const response = await this.axiosClient({
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
      this.logger.error(`❌ Cal.com API request failed: ${endpoint}`, errorMessage);

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
      this.logger.warn('Cal.com not configured - returning mock data');
      return this.getMockEventTypes();
    }

    try {
      const params = {};
      if (filters.username) params.username = filters.username;
      if (filters.eventSlug) params.eventSlug = filters.eventSlug;
      if (filters.orgSlug) params.orgSlug = filters.orgSlug;

      const data = await this.calApiRequest('/event-types', { params });
      const eventTypes = data.data || data.eventTypes || [];

      return eventTypes.map(eventType => ({
        id: eventType.id,
        slug: eventType.slug,
        title: eventType.title,
        description: eventType.description,
        duration: eventType.length,
        bookingUrl: eventType.link || this.generateBookingUrl(eventType.slug, filters.username),
        isActive: !eventType.hidden,
        requiresConfirmation: eventType.requiresConfirmation,
        disableGuests: eventType.disableGuests,
        slotInterval: eventType.slotInterval,
        minimumBookingNotice: eventType.minimumBookingNotice,
        bufferTime: eventType.bufferTime,
        color: eventType.eventTypeColor,
        teamId: eventType.teamId,
        owner: eventType.owner,
        metadata: eventType.metadata
      }));
    } catch (error) {
      this.logger.error('Error fetching event types:', error.message);
      if (process.env.NODE_ENV !== 'production') {
        return this.getMockEventTypes();
      }
      throw error;
    }
  }

  async getEventType(eventTypeId) {
    if (!this.isConfigured()) {
      const mock = this.getMockEventTypes().find(et => et.id === eventTypeId);
      return mock || this.getMockEventTypes()[0];
    }

    const data = await this.calApiRequest(`/event-types/${eventTypeId}`);
    return data.data || data;
  }

  generateBookingUrl(eventSlug, username) {
    const calUsername = username || process.env.CAL_USERNAME;
    if (!calUsername) {
      this.logger.warn('CAL_USERNAME not configured - cannot generate booking URL');
      return null;
    }

    return `https://cal.com/${calUsername}/${eventSlug}`;
  }

  async getAvailableSlots(params) {
    if (!this.isConfigured()) {
      this.logger.warn('Cal.com not configured - returning mock slots');
      return this.getMockSlots();
    }

    if (!params.start || !params.end) {
      throw new Error('Start and end dates are required');
    }

    const queryParams = {
      start: params.start,
      end: params.end
    };

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
      this.logger.warn('Cal.com not configured - returning mock booking');
      return this.getMockBooking(bookingData);
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

    if (bookingData.location) {
      payload.location = bookingData.location;
    }

    return this.calApiRequest('/bookings', {
      method: 'POST',
      body: payload
    });
  }

  async getBooking(bookingId) {
    if (!this.isConfigured()) {
      return this.getMockBooking({ id: bookingId });
    }

    return this.calApiRequest(`/bookings/${bookingId}`);
  }

  async cancelBooking(bookingId, options = {}) {
    if (!this.isConfigured()) {
      this.logger.log('Mock: Booking cancelled');
      return { id: bookingId, status: 'cancelled', mock: true };
    }

    return this.calApiRequest(`/bookings/${bookingId}/cancel`, {
      method: 'POST',
      body: { reason: options.reason || 'Cancelled by user' }
    });
  }

  async rescheduleBooking(bookingId, rescheduleData) {
    if (!this.isConfigured()) {
      this.logger.log('Mock: Booking rescheduled');
      return {
        id: bookingId,
        status: 'rescheduled',
        startTime: rescheduleData.start,
        mock: true
      };
    }

    return this.calApiRequest(`/bookings/${bookingId}/reschedule`, {
      method: 'POST',
      body: {
        start: rescheduleData.start,
        reason: rescheduleData.reason
      }
    });
  }

  async getMe() {
    if (!this.isConfigured()) {
      return {
        username: process.env.CAL_USERNAME || 'mock_user',
        mock: true
      };
    }

    try {
      return await this.calApiRequest('/me');
    } catch (error) {
      return {
        username: process.env.CAL_USERNAME,
        error: error.message
      };
    }
  }

  async getTeamMembers() {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const data = await this.calApiRequest('/teams');
      return data.data || [];
    } catch (error) {
      this.logger.warn('Could not fetch team members:', error.message);
      return [];
    }
  }

  async generateAgentBookingLink(agentId, eventTypeSlug, options = {}) {
    const db = this.getDb();
    if (!db) {
      throw new Error('Database not configured');
    }

    try {
      const { data: agent, error: agentError } = await db
        .from('real_estate_agents')
        .select('id, name, email, cal_username, metadata')
        .eq('id', agentId)
        .single();

      if (agentError || !agent) {
        throw new Error(`Agent not found: ${agentId}`);
      }

      const calUsername = agent.cal_username || agent.metadata?.cal_username || process.env.CAL_USERNAME;
      if (!calUsername) {
        throw new Error(`No Cal.com username configured for agent: ${agentId}`);
      }

      let eventType = null;
      if (this.isConfigured()) {
        const eventTypes = await this.getEventTypes({ username: calUsername });
        eventType = eventTypes.find(et => et.slug === eventTypeSlug);
      }

      let bookingUrl = this.generateBookingUrl(eventTypeSlug, calUsername);
      if (!bookingUrl) {
        bookingUrl = `https://cal.com/${calUsername}/${eventTypeSlug}`;
      }

      if (options.prefill) {
        const prefillParams = new URLSearchParams();
        if (options.prefill.name) prefillParams.append('name', options.prefill.name);
        if (options.prefill.email) prefillParams.append('email', options.prefill.email);
        if (options.prefill.notes) prefillParams.append('notes', options.prefill.notes);

        const prefillString = prefillParams.toString();
        if (prefillString) {
          bookingUrl += `?${prefillString}`;
        }
      }

      if (options.utmSource) {
        const separator = bookingUrl.includes('?') ? '&' : '?';
        bookingUrl += `${separator}utm_source=${encodeURIComponent(options.utmSource)}`;
      }

      const configData = {
        agent_id: agentId,
        cal_username: calUsername,
        cal_event_type_slug: eventTypeSlug,
        booking_url: bookingUrl,
        is_active: true,
        metadata: {
          event_type: eventType
            ? {
                id: eventType.id,
                title: eventType.title,
                duration: eventType.duration
              }
            : null,
          prefill_options: options.prefill || null,
          utm_source: options.utmSource || null,
          generated_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      };

      const { error: upsertError } = await db
        .from('agent_booking_configs')
        .upsert(configData, {
          onConflict: 'agent_id,cal_event_type_id',
          ignoreDuplicates: false
        });

      if (upsertError) {
        this.logger.warn('Failed to store booking config:', upsertError.message);
      }

      return {
        success: true,
        agentId,
        eventTypeSlug,
        bookingUrl,
        calUsername,
        eventType: eventType || null,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Error generating booking link:', error.message);
      throw error;
    }
  }

  async getAgentBookingLinks(agentId) {
    const db = this.getDb();
    if (!db) {
      throw new Error('Database not configured');
    }

    try {
      const { data: configs, error } = await db
        .from('agent_booking_configs')
        .select('*')
        .eq('agent_id', agentId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      let freshEventTypes = [];
      if (this.isConfigured()) {
        try {
          freshEventTypes = await this.getEventTypes();
        } catch (err) {
          this.logger.warn('Could not fetch fresh event types:', err.message);
        }
      }

      const links = (configs || []).map(config => {
        const freshEvent = freshEventTypes.find(et => et.slug === config.cal_event_type_slug);

        return {
          id: config.id,
          eventTypeSlug: config.cal_event_type_slug,
          bookingUrl: config.booking_url,
          isActive: config.is_active,
          autoConfirmation: config.auto_confirmation,
          bufferTimeMinutes: config.buffer_time_minutes,
          minimumNoticeHours: config.minimum_notice_hours,
          sendSmsConfirmation: config.send_sms_confirmation,
          sendEmailConfirmation: config.send_email_confirmation,
          updatedAt: config.updated_at,
          eventType: freshEvent || config.metadata?.event_type || null
        };
      });

      return {
        success: true,
        agentId,
        count: links.length,
        links
      };
    } catch (error) {
      this.logger.error('Error getting agent booking links:', error.message);
      throw error;
    }
  }

  async createPersonalizedBookingLink(agentId, eventTypeSlug, lead) {
    try {
      const result = await this.generateAgentBookingLink(agentId, eventTypeSlug, {
        prefill: {
          name: lead.name,
          email: lead.email,
          notes: lead.notes || `Referred by: ${lead.source || 'Direct'}${lead.phone ? `\nPhone: ${lead.phone}` : ''}`
        },
        utmSource: lead.source || 'leadflow'
      });

      if (lead.id) {
        const db = this.getDb();
        if (db) {
          await db
            .from('leads')
            .update({
              metadata: {
                booking_url: result.bookingUrl,
                booking_url_generated_at: new Date().toISOString(),
                booking_event_type: eventTypeSlug
              }
            })
            .eq('id', lead.id);
        }
      }

      return {
        ...result,
        personalized: true,
        lead: {
          name: lead.name,
          email: lead.email
        }
      };
    } catch (error) {
      this.logger.error('Error creating personalized booking link:', error.message);
      throw error;
    }
  }

  async deactivateBookingLink(configId) {
    const db = this.getDb();
    if (!db) {
      throw new Error('Database not configured');
    }

    const { data, error } = await db
      .from('agent_booking_configs')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', configId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      success: true,
      configId,
      deactivatedAt: new Date().toISOString(),
      config: data
    };
  }

  async updateBookingConfig(configId, updates) {
    const db = this.getDb();
    if (!db) {
      throw new Error('Database not configured');
    }

    const allowedUpdates = {
      auto_confirmation: updates.autoConfirmation,
      buffer_time_minutes: updates.bufferTimeMinutes,
      minimum_notice_hours: updates.minimumNoticeHours,
      send_sms_confirmation: updates.sendSmsConfirmation,
      send_email_confirmation: updates.sendEmailConfirmation,
      send_reminder_sms: updates.sendReminderSms,
      reminder_hours_before: updates.reminderHoursBefore,
      updated_at: new Date().toISOString()
    };

    Object.keys(allowedUpdates).forEach(key => {
      if (allowedUpdates[key] === undefined) {
        delete allowedUpdates[key];
      }
    });

    const { data, error } = await db
      .from('agent_booking_configs')
      .update(allowedUpdates)
      .eq('id', configId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      success: true,
      config: data
    };
  }

  async getQuickBookingLink(agentId, scenario) {
    const scenarioMap = {
      discovery: SCENARIOS.DISCOVERY,
      tour: SCENARIOS.PROPERTY_TOUR,
      consultation: SCENARIOS.CONSULTATION,
      call: SCENARIOS.PHONE_CALL,
      meeting: SCENARIOS.MEETING,
      showing: SCENARIOS.SHOWING
    };

    const eventTypeSlug = scenarioMap[scenario] || scenario;
    return this.generateAgentBookingLink(agentId, eventTypeSlug);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  calculateBackoffDelay(attempt) {
    const exponentialDelay = this.RETRY_CONFIG.baseDelayMs * Math.pow(this.RETRY_CONFIG.backoffMultiplier, attempt);
    const cappedDelay = Math.min(exponentialDelay, this.RETRY_CONFIG.maxDelayMs);
    const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);
    return Math.floor(cappedDelay + jitter);
  }

  async withRetry(fn, options = {}, operationName = 'operation') {
    const maxRetries = options.maxRetries ?? this.RETRY_CONFIG.maxRetries;
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (
          error.code === 'PGRST116' ||
          error.code === '23503' ||
          error.code === '23505' ||
          error.status === 400 ||
          error.status === 401 ||
          error.status === 403
        ) {
          this.logger.log(`   ❌ ${operationName} failed with non-retryable error: ${error.message}`);
          throw error;
        }

        if (attempt < maxRetries) {
          const delay = this.calculateBackoffDelay(attempt);
          this.logger.log(`   ⚠️ ${operationName} failed (attempt ${attempt + 1}/${maxRetries + 1}): ${error.message}`);
          this.logger.log(`   ⏳ Retrying in ${delay}ms...`);
          await this.sleep(delay);
        } else {
          this.logger.log(`   ❌ ${operationName} failed after ${maxRetries + 1} attempts`);
        }
      }
    }

    throw lastError;
  }

  verifyWebhookSignature(payload, signature) {
    const secret = process.env.CAL_WEBHOOK_SECRET;

    if (!secret) {
      this.logger.warn('⚠️ CAL_WEBHOOK_SECRET not configured - skipping signature verification');
      return process.env.NODE_ENV !== 'production';
    }

    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const expectedSignature = crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
    const cleanSignature = (signature || '').replace('sha256=', '');

    if (expectedSignature.length !== cleanSignature.length) {
      this.logger.error('❌ Webhook signature length mismatch');
      return false;
    }

    const isValid = crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(cleanSignature));
    if (!isValid) {
      this.logger.error('❌ Webhook signature verification failed');
    }

    return isValid;
  }

  async handleCalWebhook(event) {
    const eventType = event.triggerEvent || event.type;
    const payload = event.payload || event.data;

    this.logger.log(`📅 Processing Cal.com webhook: ${eventType}`);

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
          this.logger.log(`ℹ️ Unhandled Cal.com webhook type: ${eventType}`);
      }

      return { received: true, type: eventType, processedAt: new Date().toISOString() };
    } catch (error) {
      this.logger.error(`❌ Error handling Cal.com webhook ${eventType}:`, error.message);
      throw error;
    }
  }

  async handleBookingCreated(booking) {
    this.logger.log(`✅ Booking created: ${booking.uid}`);

    const attendee = booking.attendees?.[0];
    if (!attendee) {
      this.logger.warn('⚠️ No attendee information in booking');
      return;
    }

    const db = this.getDb();
    try {
      const leadData = await this.withRetry(
        () => this.findOrCreateLead(attendee, db),
        { context: { operation: 'findOrCreateLead', email: attendee.email } },
        'Find or create lead'
      );

      const agentId = await this.withRetry(
        () => this.findAgentForBooking(booking, db),
        { context: { operation: 'findAgentForBooking', eventTypeSlug: booking.eventType?.slug } },
        'Find agent for booking'
      );

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

      const { data: createdBooking } = await this.withRetry(
        async () => {
          const result = await db.from('bookings').upsert(bookingRecord, { onConflict: 'cal_booking_uid' }).select().single();
          if (result.error) throw result.error;
          return result;
        },
        { context: { operation: 'upsertBooking', uid: booking.uid } },
        'Create booking record'
      );

      await this.withRetry(
        () =>
          this.logBookingActivity(
            {
              bookingId: createdBooking.id,
              leadEmail: attendee.email,
              leadName: attendee.name,
              action: 'booking_created',
              eventTypeId: booking.eventTypeId,
              eventTypeSlug: booking.eventType?.slug,
              startTime: booking.startTime,
              status: 'booked',
              newData: bookingRecord
            },
            db
          ),
        { context: { operation: 'logBookingActivity', bookingId: createdBooking.id } },
        'Log booking activity'
      );

      if (leadData?.id) {
        await this.withRetry(
          async () => {
            const result = await db
              .from('leads')
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
          this.logger.warn(`   ⚠️ SMS confirmation failed (non-critical): ${smsError.message}`);
        }
      }

      await this.withRetry(
        () => this.scheduleBookingReminders(createdBooking, db),
        { context: { operation: 'scheduleReminders', bookingId: createdBooking.id } },
        'Schedule booking reminders'
      );

      this.logger.log('   ✅ Booking processed successfully');
    } catch (error) {
      this.logger.error('❌ Error handling booking created:', error.message);
      throw error;
    }
  }

  async handleBookingRescheduled(booking) {
    this.logger.log(`🔄 Booking rescheduled: ${booking.uid}`);
    const db = this.getDb();

    try {
      const { data: existingBooking } = await this.withRetry(
        async () => {
          const result = await db.from('bookings').select('*').eq('cal_booking_uid', booking.uid).single();
          if (result.error && result.error.code !== 'PGRST116') throw result.error;
          return result;
        },
        { context: { operation: 'getExistingBooking', uid: booking.uid } },
        'Get existing booking'
      );

      const attendee = booking.attendees?.[0];
      const updates = {
        start_time: booking.startTime,
        end_time: booking.endTime,
        status: 'rescheduled',
        reschedule_count: (existingBooking?.reschedule_count || 0) + 1,
        updated_at: new Date().toISOString()
      };

      const { data: updatedBooking } = await this.withRetry(
        async () => {
          const result = await db.from('bookings').update(updates).eq('cal_booking_uid', booking.uid).select().single();
          if (result.error) throw result.error;
          return result;
        },
        { context: { operation: 'updateBooking', uid: booking.uid } },
        'Update booking record'
      );

      await this.withRetry(
        () =>
          this.logBookingActivity(
            {
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
            },
            db
          ),
        { context: { operation: 'logRescheduleActivity', bookingId: updatedBooking?.id } },
        'Log reschedule activity'
      );

      if (attendee?.phoneNumber || attendee?.phone) {
        try {
          await this.sendRescheduleConfirmationSMS({
            phone: attendee.phoneNumber || attendee.phone,
            name: attendee.name,
            newStartTime: booking.startTime,
            bookingUid: booking.uid
          });
        } catch (smsError) {
          this.logger.warn(`   ⚠️ Reschedule SMS failed (non-critical): ${smsError.message}`);
        }
      }

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

      this.logger.log('   ✅ Reschedule processed');
    } catch (error) {
      this.logger.error('❌ Error handling reschedule:', error.message);
      throw error;
    }
  }

  async handleBookingCancelled(booking) {
    this.logger.log(`❌ Booking cancelled: ${booking.uid}`);
    const db = this.getDb();

    try {
      const attendee = booking.attendees?.[0];

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

      await this.withRetry(
        () =>
          this.logBookingActivity(
            {
              bookingId: existingBooking?.id,
              leadEmail: attendee?.email,
              leadName: attendee?.name,
              action: 'booking_cancelled',
              eventTypeId: booking.eventTypeId,
              status: 'cancelled',
              previousData: { status: 'booked' },
              newData: { status: 'cancelled', reason: booking.cancellationReason }
            },
            db
          ),
        { context: { operation: 'logCancellationActivity', bookingId: existingBooking?.id } },
        'Log cancellation activity'
      );

      if (existingBooking) {
        await this.withRetry(
          () => this.cancelExistingReminders(existingBooking.id, db),
          { context: { operation: 'cancelReminders', bookingId: existingBooking.id } },
          'Cancel scheduled reminders'
        );
      }

      if (existingBooking?.lead_id) {
        try {
          await createLeadSequence({
            lead_id: existingBooking.lead_id,
            sequence_type: 'no_show',
            trigger_reason: 'missed_appointment',
            metadata: {
              cal_booking_id: existingBooking.id,
              cal_booking_uid: booking.uid,
              cancellation_reason: booking.cancellationReason || null,
              triggered_by: 'BOOKING_CANCELLED'
            }
          });
        } catch (seqError) {
          this.logger.warn(`   ⚠️ no_show sequence creation failed (non-critical): ${seqError.message}`);
        }
      }

      this.logger.log('   ✅ Cancellation processed');
    } catch (error) {
      this.logger.error('❌ Error handling cancellation:', error.message);
      throw error;
    }
  }

  async handleMeetingEnded(booking) {
    this.logger.log(`🏁 Meeting ended: ${booking.uid}`);
    const db = this.getDb();

    try {
      const attendee = booking.attendees?.[0];

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

      await this.withRetry(
        () =>
          this.logBookingActivity(
            {
              bookingId: existingBooking?.id,
              leadEmail: attendee?.email,
              leadName: attendee?.name,
              action: 'meeting_completed',
              eventTypeId: booking.eventTypeId,
              status: 'completed'
            },
            db
          ),
        { context: { operation: 'logCompletionActivity', bookingId: existingBooking?.id } },
        'Log completion activity'
      );

      if (existingBooking?.lead_id) {
        try {
          await this.triggerPostMeetingFollowUp(existingBooking);
        } catch (followUpError) {
          this.logger.warn(`   ⚠️ Post-meeting follow-up failed (non-critical): ${followUpError.message}`);
        }
      }

      this.logger.log('   ✅ Meeting completion processed');
    } catch (error) {
      this.logger.error('❌ Error handling meeting end:', error.message);
      throw error;
    }
  }

  async findOrCreateLead(attendee, db) {
    if (!db) return null;

    const { data: existingLead } = await db.from('leads').select('*').eq('email', attendee.email).maybeSingle();
    if (existingLead) {
      return existingLead;
    }

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
      this.logger.warn('Could not create lead:', error.message);
      return null;
    }

    return newLead;
  }

  async findAgentForBooking(booking, db) {
    if (!db) return null;

    const { data: config } = await db
      .from('agent_booking_configs')
      .select('agent_id')
      .eq('cal_event_type_slug', booking.eventType?.slug)
      .eq('is_active', true)
      .maybeSingle();

    if (config) {
      return config.agent_id;
    }

    const { data: defaultAgent } = await db.from('real_estate_agents').select('id').eq('is_default', true).maybeSingle();
    return defaultAgent?.id || null;
  }

  async logBookingActivity(activityData, db) {
    if (!db) return;

    const { error } = await db.from('booking_activities').insert({
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
      this.logger.warn('Could not log activity:', error.message);
    }
  }

  async sendBookingConfirmationSMS(bookingData) {
    this.logger.log(`📱 Would send booking confirmation SMS to: ${bookingData.phone}`);
  }

  async sendRescheduleConfirmationSMS(bookingData) {
    this.logger.log(`📱 Would send reschedule confirmation to: ${bookingData.phone}`);
  }

  async scheduleBookingReminders(booking, db) {
    if (!db) return;

    const { data: config } = await db
      .from('agent_booking_configs')
      .select('send_reminder_sms, reminder_hours_before')
      .eq('agent_id', booking.agent_id)
      .maybeSingle();

    if (!config?.send_reminder_sms) return;

    const reminderHours = config.reminder_hours_before || 24;
    const reminderTime = new Date(new Date(booking.start_time).getTime() - reminderHours * 60 * 60 * 1000);

    const { error } = await db.from('booking_reminders').insert({
      booking_id: booking.id,
      reminder_type: 'sms',
      scheduled_for: reminderTime.toISOString(),
      status: 'pending',
      created_at: new Date().toISOString()
    });

    if (error) {
      this.logger.warn('Could not schedule reminder:', error.message);
    }
  }

  async cancelExistingReminders(bookingId, db) {
    if (!db) return;

    await db.from('booking_reminders').update({ status: 'cancelled' }).eq('booking_id', bookingId).eq('status', 'pending');
  }

  async triggerPostMeetingFollowUp(booking) {
    if (!booking.lead_id) {
      this.logger.warn('⚠️  triggerPostMeetingFollowUp: no lead_id on booking, skipping sequence creation');
      return;
    }

    await createLeadSequence({
      lead_id: booking.lead_id,
      sequence_type: 'post_viewing',
      trigger_reason: 'meeting_ended',
      metadata: {
        cal_booking_id: booking.id,
        cal_booking_uid: booking.cal_booking_uid,
        triggered_by: 'MEETING_ENDED'
      }
    });
  }

  calcomWebhookHandler(req, res) {
    const signature = req.headers['x-cal-signature-256'] || req.headers['cal-signature-256'] || req.headers['cal-signature'];

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
      .catch(err => {
        this.logger.error('Webhook processing error:', err);
        res.status(500).send('Webhook processing failed');
      });
  }

  async listWebhooks() {
    const db = this.getDb();
    if (!db) {
      return this.getMockWebhooks();
    }

    try {
      const { data, error } = await db
        .from('webhook_configs')
        .select('*')
        .eq('source', 'cal.com')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(webhook => ({
        id: webhook.id,
        webhookId: webhook.webhook_id,
        subscriberUrl: webhook.subscriber_url,
        eventTriggers: webhook.event_triggers || [],
        active: webhook.active,
        secret: webhook.secret ? '***masked***' : null,
        createdAt: webhook.created_at,
        lastFiredAt: webhook.last_fired_at,
        failureCount: webhook.failure_count || 0,
        metadata: webhook.metadata
      }));
    } catch (error) {
      this.logger.error('Error listing webhooks:', error.message);
      if (process.env.NODE_ENV !== 'production') {
        return this.getMockWebhooks();
      }
      throw error;
    }
  }

  async registerWebhook(config) {
    const db = this.getDb();
    if (!db) {
      throw new Error('Database not configured');
    }

    if (!config.subscriberUrl) throw new Error('subscriberUrl is required');
    if (!config.eventTriggers || !Array.isArray(config.eventTriggers) || config.eventTriggers.length === 0) {
      throw new Error('eventTriggers must be a non-empty array');
    }

    try {
      const parsedUrl = new URL(config.subscriberUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid subscriberUrl format');
      }
    } catch (error) {
      throw new Error('Invalid subscriberUrl format');
    }

    const secret = this.generateWebhookSecret();
    const webhookId = `wh_${crypto.randomBytes(16).toString('hex')}`;

    const webhookData = {
      webhook_id: webhookId,
      source: 'cal.com',
      subscriber_url: config.subscriberUrl,
      event_triggers: config.eventTriggers,
      active: config.active !== false,
      secret,
      failure_count: 0,
      metadata: {
        ...config.metadata,
        registered_at: new Date().toISOString(),
        registered_by: config.registeredBy || 'system'
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await db.from('webhook_configs').insert(webhookData).select().single();
    if (error) throw error;

    return {
      success: true,
      webhook: {
        id: data.id,
        webhookId: data.webhook_id,
        subscriberUrl: data.subscriber_url,
        eventTriggers: data.event_triggers,
        active: data.active,
        secret,
        createdAt: data.created_at
      },
      message: 'Webhook registered successfully'
    };
  }

  async deleteWebhook(webhookId) {
    const db = this.getDb();
    if (!db) throw new Error('Database not configured');

    const { error } = await db.from('webhook_configs').delete().eq('webhook_id', webhookId);
    if (error) throw error;

    return {
      success: true,
      webhookId,
      deletedAt: new Date().toISOString()
    };
  }

  async updateWebhook(webhookId, updates) {
    const db = this.getDb();
    if (!db) throw new Error('Database not configured');

    const allowedUpdates = {};
    if (updates.active !== undefined) allowedUpdates.active = updates.active;
    if (updates.eventTriggers !== undefined) allowedUpdates.event_triggers = updates.eventTriggers;
    if (updates.subscriberUrl !== undefined) {
      try {
        const parsedUrl = new URL(updates.subscriberUrl);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
          throw new Error('Invalid subscriberUrl format');
        }
      } catch (error) {
        throw new Error('Invalid subscriberUrl format');
      }
      allowedUpdates.subscriber_url = updates.subscriberUrl;
    }
    if (updates.metadata !== undefined) allowedUpdates.metadata = updates.metadata;

    allowedUpdates.updated_at = new Date().toISOString();

    const { data, error } = await db
      .from('webhook_configs')
      .update(allowedUpdates)
      .eq('webhook_id', webhookId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      webhook: {
        id: data.id,
        webhookId: data.webhook_id,
        subscriberUrl: data.subscriber_url,
        eventTriggers: data.event_triggers,
        active: data.active,
        updatedAt: data.updated_at
      }
    };
  }

  async getWebhook(webhookId) {
    const db = this.getDb();

    if (!db) {
      const mock = this.getMockWebhooks().find(w => w.webhookId === webhookId);
      if (!mock) {
        throw new Error('Webhook not found');
      }
      return { success: true, webhook: mock };
    }

    try {
      const { data, error } = await db.from('webhook_configs').select('*').eq('webhook_id', webhookId).single();
      if (error) throw error;

      if (!data) {
        throw new Error('Webhook not found');
      }

      return {
        success: true,
        webhook: {
          id: data.id,
          webhookId: data.webhook_id,
          subscriberUrl: data.subscriber_url,
          eventTriggers: data.event_triggers,
          active: data.active,
          secret: data.secret ? '***masked***' : null,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          lastFiredAt: data.last_fired_at,
          failureCount: data.failure_count,
          metadata: data.metadata
        }
      };
    } catch (error) {
      this.logger.error('Error getting webhook:', error.message);
      if (process.env.NODE_ENV !== 'production' && webhookId.startsWith('wh_mock')) {
        const mock = this.getMockWebhooks().find(w => w.webhookId === webhookId);
        if (mock) {
          return { success: true, webhook: mock };
        }
      }
      if (error.message.includes('not found') || error.message.includes('Not found')) {
        throw new Error('Webhook not found');
      }
      throw error;
    }
  }

  async logWebhookDelivery(logData) {
    const db = this.getDb();

    if (!db) {
      this.logger.log('📤 Webhook delivery logged (mock):', logData.eventType, logData.status);
      return;
    }

    try {
      await db.from('webhook_delivery_logs').insert({
        webhook_id: logData.webhookId,
        event_type: logData.eventType,
        payload: logData.payload,
        status: logData.status,
        http_status: logData.httpStatus,
        response_body: logData.responseBody,
        error_message: logData.errorMessage,
        attempt_number: logData.attemptNumber || 1,
        duration_ms: logData.durationMs,
        created_at: new Date().toISOString()
      });

      if (logData.webhookId) {
        const updates = { last_fired_at: new Date().toISOString() };

        if (logData.status === 'failed') {
          await db.rpc('increment_webhook_failure', {
            p_webhook_id: logData.webhookId
          });
        } else if (logData.status === 'success') {
          updates.failure_count = 0;
        }

        await db.from('webhook_configs').update(updates).eq('webhook_id', logData.webhookId);
      }
    } catch (error) {
      this.logger.error('Error logging webhook delivery:', error.message);
    }
  }

  async getWebhookDeliveryLogs(filters = {}) {
    const db = this.getDb();
    if (!db) {
      return this.getMockDeliveryLogs();
    }

    try {
      let query = db.from('webhook_delivery_logs').select('*').order('created_at', { ascending: false });

      if (filters.webhookId) query = query.eq('webhook_id', filters.webhookId);
      if (filters.eventType) query = query.eq('event_type', filters.eventType);
      if (filters.status) query = query.eq('status', filters.status);
      query = query.limit(filters.limit || 100);
      if (filters.startDate) query = query.gte('created_at', filters.startDate);
      if (filters.endDate) query = query.lte('created_at', filters.endDate);

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(log => ({
        id: log.id,
        webhookId: log.webhook_id,
        eventType: log.event_type,
        status: log.status,
        httpStatus: log.http_status,
        attemptNumber: log.attempt_number,
        durationMs: log.duration_ms,
        errorMessage: log.error_message,
        createdAt: log.created_at
      }));
    } catch (error) {
      this.logger.error('Error getting webhook logs:', error.message);
      if (process.env.NODE_ENV !== 'production') {
        return this.getMockDeliveryLogs();
      }
      throw error;
    }
  }

  async getWebhookStats(webhookId, dateRange = {}) {
    const db = this.getDb();
    if (!db) {
      return this.getMockStats();
    }

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

      return {
        total,
        successful,
        failed,
        retrying,
        successRate: total > 0 ? Math.round((successful / total) * 100) : 0,
        failureRate: total > 0 ? Math.round((failed / total) * 100) : 0
      };
    } catch (error) {
      this.logger.error('Error getting webhook stats:', error.message);
      if (process.env.NODE_ENV !== 'production') {
        return this.getMockStats();
      }
      throw error;
    }
  }

  async testWebhook(webhookId) {
    const db = this.getDb();
    if (!db) {
      return {
        success: true,
        mock: true,
        message: 'Test webhook sent (mock)',
        webhookId
      };
    }

    try {
      const { data: webhook, error } = await db.from('webhook_configs').select('*').eq('webhook_id', webhookId).single();
      if (error || !webhook) {
        throw new Error('Webhook not found');
      }

      const testPayload = {
        triggerEvent: 'TEST_EVENT',
        payload: {
          test: true,
          timestamp: new Date().toISOString(),
          message: 'This is a test webhook from LeadFlow'
        }
      };

      const startTime = Date.now();

      try {
        const signature = crypto.createHmac('sha256', webhook.secret).update(JSON.stringify(testPayload)).digest('hex');

        const response = await this.axiosClient.post(webhook.subscriber_url, testPayload, {
          headers: {
            'Content-Type': 'application/json',
            'x-cal-signature-256': signature,
            'x-webhook-test': 'true'
          },
          timeout: 10000
        });

        const duration = Date.now() - startTime;

        await this.logWebhookDelivery({
          webhookId,
          eventType: 'TEST_EVENT',
          payload: testPayload,
          status: 'success',
          httpStatus: response.status,
          attemptNumber: 1,
          durationMs: duration
        });

        return {
          success: true,
          webhookId,
          httpStatus: response.status,
          durationMs: duration,
          message: 'Test webhook delivered successfully'
        };
      } catch (error) {
        const duration = Date.now() - startTime;

        await this.logWebhookDelivery({
          webhookId,
          eventType: 'TEST_EVENT',
          payload: testPayload,
          status: 'failed',
          httpStatus: error.response?.status,
          errorMessage: error.message,
          attemptNumber: 1,
          durationMs: duration
        });

        return {
          success: false,
          webhookId,
          httpStatus: error.response?.status,
          error: error.message,
          message: 'Test webhook failed'
        };
      }
    } catch (error) {
      this.logger.error('Error testing webhook:', error.message);
      throw error;
    }
  }

  generateWebhookSecret() {
    return `whsec_${crypto.randomBytes(32).toString('hex')}`;
  }

  getMockEventTypes() {
    return [
      {
        id: 1,
        slug: 'discovery-call',
        title: 'Discovery Call',
        description: '15-minute introductory call to learn about your real estate needs',
        duration: 15,
        bookingUrl: `https://cal.com/${process.env.CAL_USERNAME || 'demo'}/discovery-call`,
        isActive: true,
        requiresConfirmation: false,
        disableGuests: false,
        slotInterval: 15,
        minimumBookingNotice: 60,
        bufferTime: 0,
        mock: true
      },
      {
        id: 2,
        slug: 'property-tour',
        title: 'Property Tour',
        description: '30-minute property viewing and consultation',
        duration: 30,
        bookingUrl: `https://cal.com/${process.env.CAL_USERNAME || 'demo'}/property-tour`,
        isActive: true,
        requiresConfirmation: true,
        disableGuests: false,
        slotInterval: 30,
        minimumBookingNotice: 1440,
        bufferTime: 15,
        mock: true
      },
      {
        id: 3,
        slug: 'consultation',
        title: 'Full Consultation',
        description: '60-minute in-depth real estate consultation',
        duration: 60,
        bookingUrl: `https://cal.com/${process.env.CAL_USERNAME || 'demo'}/consultation`,
        isActive: true,
        requiresConfirmation: true,
        disableGuests: true,
        slotInterval: 60,
        minimumBookingNotice: 2880,
        bufferTime: 30,
        mock: true
      },
      {
        id: 4,
        slug: 'buyer-consultation',
        title: 'Buyer Consultation',
        description: '45-minute consultation for home buyers',
        duration: 45,
        bookingUrl: `https://cal.com/${process.env.CAL_USERNAME || 'demo'}/buyer-consultation`,
        isActive: true,
        requiresConfirmation: false,
        disableGuests: false,
        slotInterval: 45,
        minimumBookingNotice: 720,
        bufferTime: 15,
        mock: true
      },
      {
        id: 5,
        slug: 'seller-consultation',
        title: 'Seller Consultation',
        description: '45-minute consultation for home sellers',
        duration: 45,
        bookingUrl: `https://cal.com/${process.env.CAL_USERNAME || 'demo'}/seller-consultation`,
        isActive: true,
        requiresConfirmation: false,
        disableGuests: false,
        slotInterval: 45,
        minimumBookingNotice: 720,
        bufferTime: 15,
        mock: true
      }
    ];
  }

  getMockSlots() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    const slots = [];
    for (let i = 0; i < 8; i++) {
      const slotTime = new Date(tomorrow.getTime() + i * 60 * 60 * 1000);
      slots.push({
        time: slotTime.toISOString(),
        available: true
      });
    }

    return {
      slots,
      mock: true
    };
  }

  getMockBooking(bookingData = {}) {
    const duration = bookingData.duration || 30;
    const startTime = bookingData.start || new Date().toISOString();
    const endTime = new Date(new Date(startTime).getTime() + duration * 60 * 1000).toISOString();

    return {
      id: bookingData.id || `mock_booking_${Date.now()}`,
      uid: `mock_uid_${Date.now()}`,
      status: 'accepted',
      startTime,
      endTime,
      attendee: bookingData.attendee || { name: 'Test User', email: 'test@example.com' },
      eventTypeId: bookingData.eventTypeId || 1,
      metadata: bookingData.metadata || {},
      mock: true
    };
  }

  getMockWebhooks() {
    return [
      {
        id: 'mock-1',
        webhookId: 'wh_mock_001',
        subscriberUrl: 'https://example.com/webhook/calcom',
        eventTriggers: ['BOOKING_CREATED', 'BOOKING_CANCELLED'],
        active: true,
        secret: '***masked***',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        lastFiredAt: new Date(Date.now() - 3600000).toISOString(),
        failureCount: 0,
        metadata: { mock: true }
      }
    ];
  }

  getMockDeliveryLogs() {
    return [
      {
        id: 'mock-log-1',
        webhookId: 'wh_mock_001',
        eventType: 'BOOKING_CREATED',
        status: 'success',
        httpStatus: 200,
        attemptNumber: 1,
        durationMs: 150,
        createdAt: new Date().toISOString()
      }
    ];
  }

  getMockStats() {
    return {
      total: 150,
      successful: 145,
      failed: 3,
      retrying: 2,
      successRate: 97,
      failureRate: 2
    };
  }
}

module.exports = CalcomService;
