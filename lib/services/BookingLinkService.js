/**
 * BookingLinkService
 *
 * Generates and manages personalized booking links for agents.
 * Integrates with Cal.com API and stores configuration in the database.
 */

const { createClient } = require('../db');
const { getEventTypes, generateBookingUrl, isConfigured } = require('./CalcomClient');

const SCENARIO_MAP = {
    discovery: 'discovery-call',
    tour: 'property-tour',
    consultation: 'consultation',
    call: 'phone-call',
    meeting: 'meeting',
    showing: 'property-showing'
};

const SCENARIOS = {
    DISCOVERY: 'discovery-call',
    PROPERTY_TOUR: 'property-tour',
    CONSULTATION: 'consultation',
    PHONE_CALL: 'phone-call',
    MEETING: 'meeting',
    SHOWING: 'property-showing'
};

class BookingLinkService {
    /**
     * @param {Object} options
     * @param {Object} [options.db] - PostgREST client (injected for testing)
     */
    constructor(options = {}) {
        this._db = options.db || null;
    }

    _getDb() {
        if (!this._db) {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL;
            const apiKey = process.env.API_SECRET_KEY || process.env.LEADFLOW_API_KEY;
            if (apiUrl && apiKey) {
                this._db = createClient(apiUrl, apiKey);
            }
        }
        return this._db;
    }

    /**
     * Generate booking link for an agent.
     *
     * @param {string} agentId
     * @param {string} eventTypeSlug
     * @param {Object} [options]
     * @param {Object} [options.prefill] - { name, email, notes }
     * @param {string} [options.utmSource]
     * @returns {Promise<Object>}
     */
    async generateAgentBookingLink(agentId, eventTypeSlug, options = {}) {
        const db = this._getDb();
        if (!db) throw new Error('Database not configured');

        // 1. Get agent details
        const { data: agent, error: agentError } = await db
            .from('real_estate_agents')
            .select('id, name, email, cal_username, metadata')
            .eq('id', agentId)
            .single();

        if (agentError || !agent) {
            throw new Error(`Agent not found: ${agentId}`);
        }

        // 2. Resolve Cal.com username
        const calUsername = agent.cal_username ||
            agent.metadata?.cal_username ||
            process.env.CAL_USERNAME;

        if (!calUsername) {
            throw new Error(`No Cal.com username configured for agent: ${agentId}`);
        }

        // 3. Verify event type exists
        let eventType = null;
        if (isConfigured()) {
            const eventTypes = await getEventTypes({ username: calUsername });
            eventType = eventTypes.find(et => et.slug === eventTypeSlug) || null;
        }

        // 4. Generate booking URL
        let bookingUrl = generateBookingUrl(eventTypeSlug, calUsername) ||
            `https://cal.com/${calUsername}/${eventTypeSlug}`;

        // 5. Add prefill parameters
        if (options.prefill) {
            const prefillParams = new URLSearchParams();
            if (options.prefill.name)  prefillParams.append('name',  options.prefill.name);
            if (options.prefill.email) prefillParams.append('email', options.prefill.email);
            if (options.prefill.notes) prefillParams.append('notes', options.prefill.notes);
            const prefillString = prefillParams.toString();
            if (prefillString) bookingUrl += `?${prefillString}`;
        }

        // 6. Add UTM tracking
        if (options.utmSource) {
            const separator = bookingUrl.includes('?') ? '&' : '?';
            bookingUrl += `${separator}utm_source=${encodeURIComponent(options.utmSource)}`;
        }

        // 7. Persist booking config
        const configData = {
            agent_id: agentId,
            cal_username: calUsername,
            cal_event_type_slug: eventTypeSlug,
            booking_url: bookingUrl,
            is_active: true,
            metadata: {
                event_type: eventType
                    ? { id: eventType.id, title: eventType.title, duration: eventType.duration }
                    : null,
                prefill_options: options.prefill || null,
                utm_source: options.utmSource || null,
                generated_at: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
        };

        const { error: upsertError } = await db
            .from('agent_booking_configs')
            .upsert(configData, { onConflict: 'agent_id,cal_event_type_id', ignoreDuplicates: false });

        if (upsertError) {
            console.warn('Failed to store booking config:', upsertError.message);
        }

        return {
            success: true,
            agentId,
            eventTypeSlug,
            bookingUrl,
            calUsername,
            eventType,
            generatedAt: new Date().toISOString()
        };
    }

    /**
     * Get all active booking links for an agent.
     *
     * @param {string} agentId
     * @returns {Promise<Object>}
     */
    async getAgentBookingLinks(agentId) {
        const db = this._getDb();
        if (!db) throw new Error('Database not configured');

        const { data: configs, error } = await db
            .from('agent_booking_configs')
            .select('*')
            .eq('agent_id', agentId)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) throw error;

        let freshEventTypes = [];
        if (isConfigured()) {
            try {
                freshEventTypes = await getEventTypes();
            } catch (err) {
                console.warn('Could not fetch fresh event types:', err.message);
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

        return { success: true, agentId, count: links.length, links };
    }

    /**
     * Create a personalized booking link for a lead (pre-filled).
     *
     * @param {string} agentId
     * @param {string} eventTypeSlug
     * @param {Object} lead - { id?, name, email, phone?, notes?, source? }
     * @returns {Promise<Object>}
     */
    async createPersonalizedBookingLink(agentId, eventTypeSlug, lead) {
        const result = await this.generateAgentBookingLink(agentId, eventTypeSlug, {
            prefill: {
                name: lead.name,
                email: lead.email,
                notes: lead.notes ||
                    `Referred by: ${lead.source || 'Direct'}${lead.phone ? `\nPhone: ${lead.phone}` : ''}`
            },
            utmSource: lead.source || 'leadflow'
        });

        if (lead.id) {
            const db = this._getDb();
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

        return { ...result, personalized: true, lead: { name: lead.name, email: lead.email } };
    }

    /**
     * Deactivate a booking link by config ID.
     *
     * @param {string} configId
     * @returns {Promise<Object>}
     */
    async deactivateBookingLink(configId) {
        const db = this._getDb();
        if (!db) throw new Error('Database not configured');

        const { error } = await db
            .from('agent_booking_configs')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', configId)
            .select()
            .single();

        if (error) throw error;

        return { success: true, configId, deactivatedAt: new Date().toISOString() };
    }

    /**
     * Update booking configuration fields.
     *
     * @param {string} configId
     * @param {Object} updates - camelCase field names
     * @returns {Promise<Object>}
     */
    async updateBookingConfig(configId, updates) {
        const db = this._getDb();
        if (!db) throw new Error('Database not configured');

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
            if (allowedUpdates[key] === undefined) delete allowedUpdates[key];
        });

        const { data, error } = await db
            .from('agent_booking_configs')
            .update(allowedUpdates)
            .eq('id', configId)
            .select()
            .single();

        if (error) throw error;

        return { success: true, config: data };
    }

    /**
     * Get a booking link for a common scenario shorthand.
     *
     * @param {string} agentId
     * @param {string} scenario - e.g. 'discovery', 'tour'
     * @returns {Promise<Object>}
     */
    async getQuickBookingLink(agentId, scenario) {
        const eventTypeSlug = SCENARIO_MAP[scenario] || scenario;
        return this.generateAgentBookingLink(agentId, eventTypeSlug);
    }
}

BookingLinkService.SCENARIOS = SCENARIOS;

module.exports = BookingLinkService;
