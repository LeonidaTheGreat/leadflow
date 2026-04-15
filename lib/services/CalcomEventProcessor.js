'use strict';

/**
 * CalcomEventProcessor — event-specific booking logic for Cal.com webhooks.
 *
 * Responsibilities:
 *   - Handle BOOKING_CREATED, BOOKING_RESCHEDULED, BOOKING_CANCELLED, MEETING_ENDED
 *   - All DB reads/writes related to bookings, leads, activities, and reminders
 *   - SMS notifications via TwilioService
 *   - Sequence triggers via SequenceService
 *
 * Not responsible for:
 *   - Signature verification (CalcomWebhookHandler)
 *   - HTTP request/response (CalcomWebhookHandler)
 *   - DB client initialisation (injected via constructor)
 */

const { logger } = require('../logger');
const { withRetry } = require('../utils/circuit-breaker');
const { createLeadSequence } = require('./SequenceService');
const TwilioService = require('./TwilioService');

const log = logger.child('CalcomEventProcessor');

const twilioService = new TwilioService();

class CalcomEventProcessor {
  /**
   * @param {Object} options
   * @param {Object} options.db              - PostgREST database client (required)
   * @param {Function} options.createLeadSequence - Override for sequence creation (tests)
   * @param {Object} options.twilioService   - Override for SMS sending (tests)
   */
  constructor(options = {}) {
    if (!options.db) {
      throw new Error('CalcomEventProcessor requires a db client');
    }
    this.db = options.db;
    this.createLeadSequence = options.createLeadSequence || createLeadSequence;
    this.twilioService = options.twilioService || twilioService;
  }

  // ===== RETRY WRAPPER =====

  async withRetry(fn, opts = {}) {
    return withRetry(fn, opts);
  }

  // ===== EVENT DISPATCHING =====

  /**
   * Dispatch a Cal.com webhook event to the appropriate handler.
   *
   * @param {Object} event - Normalised webhook event (has triggerEvent or type)
   * @returns {Promise<{received: boolean, type: string, processedAt: string}>}
   */
  async process(event) {
    const eventType = event.triggerEvent || event.type;
    const payload = event.payload || event.data;

    log.info('Processing Cal.com event', { eventType });

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
          log.info('Unhandled Cal.com event type', { eventType });
      }

      return { received: true, type: eventType, processedAt: new Date().toISOString() };
    } catch (error) {
      log.error('Error processing Cal.com event', error, { eventType });
      throw error;
    }
  }

  // ===== EVENT HANDLERS =====

  /**
   * Handle new booking created.
   * @param {Object} booking - Booking payload from webhook
   */
  async handleBookingCreated(booking) {
    log.info('Booking created', { uid: booking.uid });

    const attendee = booking.attendees?.[0];
    if (!attendee) {
      log.warn('No attendee information in booking', { uid: booking.uid });
      return;
    }

    log.info('Booking attendee details', {
      name: attendee.name,
      email: attendee.email,
      startTime: booking.startTime,
      eventType: booking.eventType?.slug || booking.eventTypeId,
    });

    const db = this.db;

    try {
      // 1. Find or create lead
      const leadData = await this.withRetry(
        () => this.findOrCreateLead(attendee, db),
        { context: { operation: 'findOrCreateLead', email: attendee.email }, operationName: 'Find or create lead' }
      );

      // 2. Find agent for booking
      const agentId = await this.withRetry(
        () => this.findAgentForBooking(booking, db),
        { context: { operation: 'findAgentForBooking', eventTypeSlug: booking.eventType?.slug }, operationName: 'Find agent for booking' }
      );

      // 3. Create booking record
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
          raw_webhook: booking,
        },
        source: 'cal.com',
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
        { context: { operation: 'upsertBooking', uid: booking.uid }, operationName: 'Create booking record' }
      );

      if (bookingError) throw bookingError;

      log.info('Created booking record', { bookingId: createdBooking.id });

      // 4. Log activity
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
          newData: bookingRecord,
        }, db),
        { context: { operation: 'logBookingActivity', bookingId: createdBooking.id }, operationName: 'Log booking activity' }
      );

      // 5. Update lead status
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
                  last_booking_date: booking.startTime,
                },
              })
              .eq('id', leadData.id);
            if (result.error) throw result.error;
            return result;
          },
          { context: { operation: 'updateLeadStatus', leadId: leadData.id }, operationName: 'Update lead status' }
        );
      }

      // 6. Send confirmation SMS (non-critical)
      if (attendee.phoneNumber || attendee.phone) {
        try {
          await this.sendBookingConfirmationSMS({
            phone: attendee.phoneNumber || attendee.phone,
            name: attendee.name,
            startTime: booking.startTime,
            meetingUrl: booking.meeting_url,
            bookingUid: booking.uid,
          });
        } catch (smsError) {
          log.warn('SMS confirmation failed (non-critical)', { error: smsError.message });
        }
      }

      // 7. Schedule reminders
      await this.withRetry(
        () => this.scheduleBookingReminders(createdBooking, db),
        { context: { operation: 'scheduleReminders', bookingId: createdBooking.id }, operationName: 'Schedule booking reminders' }
      );

      log.info('Booking processed successfully', { uid: booking.uid });
    } catch (error) {
      log.error('Error handling booking created', error, { uid: booking.uid });
      throw error;
    }
  }

  /**
   * Handle booking rescheduled.
   * @param {Object} booking - Booking payload from webhook
   */
  async handleBookingRescheduled(booking) {
    log.info('Booking rescheduled', { uid: booking.uid, newStartTime: booking.startTime });

    const db = this.db;

    try {
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
        { context: { operation: 'getExistingBooking', uid: booking.uid }, operationName: 'Get existing booking' }
      );

      const attendee = booking.attendees?.[0];

      const updates = {
        start_time: booking.startTime,
        end_time: booking.endTime,
        status: 'rescheduled',
        reschedule_count: (existingBooking?.reschedule_count || 0) + 1,
        updated_at: new Date().toISOString(),
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
        { context: { operation: 'updateBooking', uid: booking.uid }, operationName: 'Update booking record' }
      );

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
          newData: updates,
        }, db),
        { context: { operation: 'logRescheduleActivity', bookingId: updatedBooking?.id }, operationName: 'Log reschedule activity' }
      );

      if (attendee?.phoneNumber || attendee?.phone) {
        try {
          await this.sendRescheduleConfirmationSMS({
            phone: attendee.phoneNumber || attendee.phone,
            name: attendee.name,
            newStartTime: booking.startTime,
            bookingUid: booking.uid,
          });
        } catch (smsError) {
          log.warn('Reschedule SMS failed (non-critical)', { error: smsError.message });
        }
      }

      if (updatedBooking) {
        await this.withRetry(
          () => this.cancelExistingReminders(updatedBooking.id, db),
          { context: { operation: 'cancelReminders', bookingId: updatedBooking.id }, operationName: 'Cancel existing reminders' }
        );
        await this.withRetry(
          () => this.scheduleBookingReminders(updatedBooking, db),
          { context: { operation: 'scheduleNewReminders', bookingId: updatedBooking.id }, operationName: 'Schedule new reminders' }
        );
      }

      log.info('Reschedule processed', { uid: booking.uid });
    } catch (error) {
      log.error('Error handling reschedule', error, { uid: booking.uid });
      throw error;
    }
  }

  /**
   * Handle booking cancelled.
   * @param {Object} booking - Booking payload from webhook
   */
  async handleBookingCancelled(booking) {
    log.info('Booking cancelled', { uid: booking.uid, reason: booking.cancellationReason || 'No reason provided' });

    const db = this.db;

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
              updated_at: new Date().toISOString(),
            })
            .eq('cal_booking_uid', booking.uid)
            .select()
            .single();
          if (result.error && result.error.code !== 'PGRST116') throw result.error;
          return result;
        },
        { context: { operation: 'cancelBooking', uid: booking.uid }, operationName: 'Cancel booking' }
      );

      await this.withRetry(
        () => this.logBookingActivity({
          bookingId: existingBooking?.id,
          leadEmail: attendee?.email,
          leadName: attendee?.name,
          action: 'booking_cancelled',
          eventTypeId: booking.eventTypeId,
          status: 'cancelled',
          previousData: { status: 'booked' },
          newData: { status: 'cancelled', reason: booking.cancellationReason },
        }, db),
        { context: { operation: 'logCancellationActivity', bookingId: existingBooking?.id }, operationName: 'Log cancellation activity' }
      );

      if (existingBooking) {
        await this.withRetry(
          () => this.cancelExistingReminders(existingBooking.id, db),
          { context: { operation: 'cancelReminders', bookingId: existingBooking.id }, operationName: 'Cancel scheduled reminders' }
        );
      }

      // UC-8: Trigger no_show sequence if booking was cancelled
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
          log.warn('no_show sequence creation failed (non-critical)', { error: seqError.message });
        }
      }

      log.info('Cancellation processed', { uid: booking.uid });
    } catch (error) {
      log.error('Error handling cancellation', error, { uid: booking.uid });
      throw error;
    }
  }

  /**
   * Handle meeting ended.
   * @param {Object} booking - Booking payload from webhook
   */
  async handleMeetingEnded(booking) {
    log.info('Meeting ended', { uid: booking.uid });

    const db = this.db;

    try {
      const attendee = booking.attendees?.[0];

      const { data: existingBooking } = await this.withRetry(
        async () => {
          const result = await db
            .from('bookings')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('cal_booking_uid', booking.uid)
            .select()
            .single();
          if (result.error && result.error.code !== 'PGRST116') throw result.error;
          return result;
        },
        { context: { operation: 'completeBooking', uid: booking.uid }, operationName: 'Complete booking' }
      );

      await this.withRetry(
        () => this.logBookingActivity({
          bookingId: existingBooking?.id,
          leadEmail: attendee?.email,
          leadName: attendee?.name,
          action: 'meeting_completed',
          eventTypeId: booking.eventTypeId,
          status: 'completed',
        }, db),
        { context: { operation: 'logCompletionActivity', bookingId: existingBooking?.id }, operationName: 'Log completion activity' }
      );

      // Trigger post-meeting follow-up (non-critical)
      if (existingBooking?.lead_id) {
        try {
          await this.triggerPostMeetingFollowUp(existingBooking);
        } catch (followUpError) {
          log.warn('Post-meeting follow-up failed (non-critical)', { error: followUpError.message });
        }
      }

      log.info('Meeting completion processed', { uid: booking.uid });
    } catch (error) {
      log.error('Error handling meeting end', error, { uid: booking.uid });
      throw error;
    }
  }

  // ===== HELPER METHODS =====

  /**
   * Find or create a lead from Cal.com attendee data.
   */
  async findOrCreateLead(attendee, db) {
    if (!db) return null;

    const { data: existingLead } = await db
      .from('leads')
      .select('*')
      .eq('email', attendee.email)
      .maybeSingle();

    if (existingLead) {
      log.info('Found existing lead', { leadId: existingLead.id });
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
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      log.warn('Could not create lead', { error: error.message });
      return null;
    }

    if (!newLead) {
      log.warn('Lead insert returned no data');
      return null;
    }

    log.info('Created new lead', { leadId: newLead.id });
    return newLead;
  }

  /**
   * Find the agent associated with a booking's event type.
   */
  async findAgentForBooking(booking, db) {
    if (!db) return null;

    const { data: config } = await db
      .from('agent_booking_configs')
      .select('agent_id')
      .eq('cal_event_type_slug', booking.eventType?.slug)
      .eq('is_active', true)
      .maybeSingle();

    if (config) return config.agent_id;

    const { data: defaultAgent } = await db
      .from('real_estate_agents')
      .select('id')
      .eq('is_default', true)
      .maybeSingle();

    return defaultAgent?.id || null;
  }

  /**
   * Log booking activity to the audit table.
   */
  async logBookingActivity(activityData, db) {
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
        created_at: new Date().toISOString(),
      });

    if (error) {
      log.warn('Could not log activity', { error: error.message });
    }
  }

  /**
   * Send booking confirmation SMS.
   */
  async sendBookingConfirmationSMS(bookingData) {
    if (!bookingData.phone) {
      log.warn('sendBookingConfirmationSMS: no phone number provided, skipping');
      return;
    }

    const startTime = bookingData.startTime
      ? new Date(bookingData.startTime).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
      : 'your scheduled time';

    const message = `Hi ${bookingData.name || 'there'}, your appointment has been confirmed for ${startTime}. Reply STOP to unsubscribe.`;

    await this.twilioService.sendSms(bookingData.phone, message, { trigger: 'booking_confirmation' });
    log.info('SMS booking confirmation sent', { phoneSuffix: `***${String(bookingData.phone).slice(-4)}` });
  }

  /**
   * Send reschedule confirmation SMS.
   */
  async sendRescheduleConfirmationSMS(bookingData) {
    if (!bookingData.phone) {
      log.warn('sendRescheduleConfirmationSMS: no phone number provided, skipping');
      return;
    }

    const newStartTime = bookingData.newStartTime
      ? new Date(bookingData.newStartTime).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
      : 'your new scheduled time';

    const message = `Hi ${bookingData.name || 'there'}, your appointment has been rescheduled to ${newStartTime}. Reply STOP to unsubscribe.`;

    await this.twilioService.sendSms(bookingData.phone, message, { trigger: 'reschedule_confirmation' });
    log.info('SMS reschedule confirmation sent', { phoneSuffix: `***${String(bookingData.phone).slice(-4)}` });
  }

  /**
   * Schedule booking reminders.
   */
  async scheduleBookingReminders(booking, db) {
    if (!db) return;

    const { data: config } = await db
      .from('agent_booking_configs')
      .select('send_reminder_sms, reminder_hours_before')
      .eq('agent_id', booking.agent_id)
      .maybeSingle();

    if (!config?.send_reminder_sms) return;

    const reminderHours = config.reminder_hours_before || 24;
    const startTime = new Date(booking.start_time);
    const reminderTime = new Date(startTime.getTime() - (reminderHours * 60 * 60 * 1000));

    const { error } = await db
      .from('booking_reminders')
      .insert({
        booking_id: booking.id,
        reminder_type: 'sms',
        scheduled_for: reminderTime.toISOString(),
        status: 'pending',
        created_at: new Date().toISOString(),
      });

    if (error) {
      log.warn('Could not schedule reminder', { error: error.message });
    } else {
      log.info('Scheduled reminder', { scheduledFor: reminderTime.toISOString() });
    }
  }

  /**
   * Cancel pending reminders for a booking.
   */
  async cancelExistingReminders(bookingId, db) {
    if (!db) return;

    await db
      .from('booking_reminders')
      .update({ status: 'cancelled' })
      .eq('booking_id', bookingId)
      .eq('status', 'pending');
  }

  /**
   * Trigger post-meeting follow-up sequence.
   */
  async triggerPostMeetingFollowUp(booking) {
    log.info('Triggering post-meeting follow-up', { bookingId: booking.id });

    if (!booking.lead_id) {
      log.warn('triggerPostMeetingFollowUp: no lead_id on booking, skipping sequence creation', { bookingId: booking.id });
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
}

module.exports = CalcomEventProcessor;
