/**
 * Booking Link Generation Service
 * 
 * Generates personalized booking links for agents
 * Integrates with Cal.com API and stores configuration in Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const { getEventTypes, generateBookingUrl, isConfigured } = require('./calcom');

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

/**
 * Generate booking link for an agent
 * @param {Object} params - Generation parameters
 * @param {string} params.agentId - Agent ID
 * @param {string} params.eventTypeSlug - Cal.com event type slug (e.g., 'discovery-call')
 * @param {Object} params.options - Additional options
 * @param {string} params.options.duration - Override duration
 * @param {Object} params.options.prefill - Prefill data (name, email, etc.)
 * @param {string} params.options.utmSource - UTM source tracking
 * @returns {Promise<Object>} Booking link details
 */
async function generateAgentBookingLink(agentId, eventTypeSlug, options = {}) {
    const db = getSupabase();
    
    if (!db) {
        throw new Error('Supabase not configured');
    }

    try {
        // 1. Get agent details
        const { data: agent, error: agentError } = await db
            .from('real_estate_agents')
            .select('id, name, email, cal_username, metadata')
            .eq('id', agentId)
            .single();

        if (agentError || !agent) {
            throw new Error(`Agent not found: ${agentId}`);
        }

        // 2. Get agent's Cal.com username (from agent record or env)
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
            eventType = eventTypes.find(et => et.slug === eventTypeSlug);
        }

        // 4. Generate booking URL
        let bookingUrl = generateBookingUrl(eventTypeSlug, calUsername);
        
        if (!bookingUrl) {
            // Fallback: construct manually
            bookingUrl = `https://cal.com/${calUsername}/${eventTypeSlug}`;
        }

        // 5. Add prefill parameters if provided
        if (options.prefill) {
            const prefillParams = new URLSearchParams();
            
            if (options.prefill.name) {
                prefillParams.append('name', options.prefill.name);
            }
            if (options.prefill.email) {
                prefillParams.append('email', options.prefill.email);
            }
            if (options.prefill.notes) {
                prefillParams.append('notes', options.prefill.notes);
            }
            
            const prefillString = prefillParams.toString();
            if (prefillString) {
                bookingUrl += `?${prefillString}`;
            }
        }

        // 6. Add UTM tracking
        if (options.utmSource) {
            const separator = bookingUrl.includes('?') ? '&' : '?';
            bookingUrl += `${separator}utm_source=${encodeURIComponent(options.utmSource)}`;
        }

        // 7. Store/update booking config in database
        const configData = {
            agent_id: agentId,
            cal_username: calUsername,
            cal_event_type_slug: eventTypeSlug,
            booking_url: bookingUrl,
            is_active: true,
            metadata: {
                event_type: eventType ? {
                    id: eventType.id,
                    title: eventType.title,
                    duration: eventType.duration
                } : null,
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
            console.warn('Failed to store booking config:', upsertError.message);
            // Don't fail - return the link anyway
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
        console.error('Error generating booking link:', error.message);
        throw error;
    }
}

/**
 * Get all booking links for an agent
 * @param {string} agentId - Agent ID
 * @returns {Promise<Array>} Array of booking links
 */
async function getAgentBookingLinks(agentId) {
    const db = getSupabase();
    
    if (!db) {
        throw new Error('Supabase not configured');
    }

    try {
        // Get stored configs
        const { data: configs, error } = await db
            .from('agent_booking_configs')
            .select('*')
            .eq('agent_id', agentId)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        // Also fetch current Cal.com event types to ensure freshness
        let freshEventTypes = [];
        if (isConfigured()) {
            try {
                freshEventTypes = await getEventTypes();
            } catch (err) {
                console.warn('Could not fetch fresh event types:', err.message);
            }
        }

        // Merge stored configs with fresh data
        const links = (configs || []).map(config => {
            const freshEvent = freshEventTypes.find(
                et => et.slug === config.cal_event_type_slug
            );

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
        console.error('Error getting agent booking links:', error.message);
        throw error;
    }
}

/**
 * Create personalized booking link for a lead
 * @param {Object} params - Parameters
 * @param {string} params.agentId - Agent ID
 * @param {string} params.eventTypeSlug - Event type slug
 * @param {Object} params.lead - Lead information
 * @param {string} params.lead.name - Lead name
 * @param {string} params.lead.email - Lead email
 * @param {string} params.lead.phone - Lead phone
 * @param {string} params.lead.notes - Additional notes
 * @returns {Promise<Object>} Personalized booking link
 */
async function createPersonalizedBookingLink(agentId, eventTypeSlug, lead) {
    try {
        // Generate link with prefill
        const result = await generateAgentBookingLink(agentId, eventTypeSlug, {
            prefill: {
                name: lead.name,
                email: lead.email,
                notes: lead.notes || `Referred by: ${lead.source || 'Direct'}${lead.phone ? `\nPhone: ${lead.phone}` : ''}`
            },
            utmSource: lead.source || 'leadflow'
        });

        // Store lead-booking association if we have lead ID
        if (lead.id) {
            const db = getSupabase();
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
        console.error('Error creating personalized booking link:', error.message);
        throw error;
    }
}

/**
 * Deactivate a booking link
 * @param {string} configId - Booking config ID
 * @returns {Promise<Object>} Result
 */
async function deactivateBookingLink(configId) {
    const db = getSupabase();
    
    if (!db) {
        throw new Error('Supabase not configured');
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
        deactivatedAt: new Date().toISOString()
    };
}

/**
 * Update booking configuration
 * @param {string} configId - Config ID
 * @param {Object} updates - Configuration updates
 * @returns {Promise<Object>} Updated config
 */
async function updateBookingConfig(configId, updates) {
    const db = getSupabase();
    
    if (!db) {
        throw new Error('Supabase not configured');
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

    // Remove undefined values
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

/**
 * Get quick booking link for common scenarios
 * @param {string} agentId - Agent ID
 * @param {string} scenario - Scenario type
 * @returns {Promise<Object>} Booking link
 */
async function getQuickBookingLink(agentId, scenario) {
    const scenarioMap = {
        'discovery': 'discovery-call',
        'tour': 'property-tour',
        'consultation': 'consultation',
        'call': 'phone-call',
        'meeting': 'meeting',
        'showing': 'property-showing'
    };

    const eventTypeSlug = scenarioMap[scenario] || scenario;
    
    return generateAgentBookingLink(agentId, eventTypeSlug);
}

module.exports = {
    // Main functions
    generateAgentBookingLink,
    getAgentBookingLinks,
    createPersonalizedBookingLink,
    deactivateBookingLink,
    updateBookingConfig,
    getQuickBookingLink,
    
    // Scenario mappings
    SCENARIOS: {
        DISCOVERY: 'discovery-call',
        PROPERTY_TOUR: 'property-tour',
        CONSULTATION: 'consultation',
        PHONE_CALL: 'phone-call',
        MEETING: 'meeting',
        SHOWING: 'property-showing'
    }
};
