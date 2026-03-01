/**
 * Cal.com API Routes
 * Endpoints for booking link integration and management
 */

const express = require('express');
const router = express.Router();
const {
    getEventTypes,
    getAvailableSlots,
    createBooking,
    getMe,
    isConfigured
} = require('../lib/calcom');

const {
    generateAgentBookingLink,
    getAgentBookingLinks,
    createPersonalizedBookingLink,
    updateBookingConfig,
    getQuickBookingLink,
    SCENARIOS
} = require('../lib/booking-link-service');

/**
 * GET /api/calcom/status
 * Check if Cal.com integration is configured
 */
router.get('/status', async (req, res) => {
    try {
        const configured = isConfigured();
        let userProfile = null;
        
        if (configured) {
            try {
                userProfile = await getMe();
            } catch (err) {
                console.warn('Could not fetch user profile:', err.message);
            }
        }
        
        res.json({
            success: true,
            configured,
            username: userProfile?.username || process.env.CAL_USERNAME || null,
            profile: userProfile,
            message: configured 
                ? 'Cal.com integration is active'
                : 'Cal.com integration not configured (set CAL_API_KEY)'
        });
    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({
            error: 'Failed to check status',
            message: error.message
        });
    }
});

/**
 * GET /api/calcom/event-types
 * Fetch all event types (booking links) for the agent
 */
router.get('/event-types', async (req, res) => {
    try {
        const { username, eventSlug, orgSlug } = req.query;
        
        const eventTypes = await getEventTypes({
            username,
            eventSlug,
            orgSlug
        });

        res.json({
            success: true,
            count: eventTypes.length,
            eventTypes
        });

    } catch (error) {
        console.error('Get event types error:', error);
        res.status(500).json({
            error: 'Failed to fetch event types',
            message: error.message
        });
    }
});

/**
 * GET /api/calcom/booking-links
 * Get simplified booking links for agents
 */
router.get('/booking-links', async (req, res) => {
    try {
        const { username, agentId } = req.query;
        
        // If agentId provided, get stored links from database
        if (agentId) {
            const result = await getAgentBookingLinks(agentId);
            return res.json(result);
        }
        
        // Otherwise, fetch from Cal.com API
        const eventTypes = await getEventTypes({ username });
        
        const bookingLinks = eventTypes
            .filter(et => et.isActive)
            .map(et => ({
                id: et.id,
                slug: et.slug,
                title: et.title,
                url: et.bookingUrl,
                duration: et.duration,
                description: et.description,
                requiresConfirmation: et.requiresConfirmation
            }));

        res.json({
            success: true,
            count: bookingLinks.length,
            links: bookingLinks
        });

    } catch (error) {
        console.error('Get booking links error:', error);
        res.status(500).json({
            error: 'Failed to fetch booking links',
            message: error.message
        });
    }
});

/**
 * POST /api/calcom/generate-link
 * Generate a personalized booking link for an agent
 */
router.post('/generate-link', async (req, res) => {
    try {
        const { agentId, eventTypeSlug, options } = req.body;

        if (!agentId || !eventTypeSlug) {
            return res.status(400).json({
                error: 'Missing required fields: agentId, eventTypeSlug'
            });
        }

        const result = await generateAgentBookingLink(agentId, eventTypeSlug, options || {});
        res.json(result);

    } catch (error) {
        console.error('Generate link error:', error);
        res.status(500).json({
            error: 'Failed to generate booking link',
            message: error.message
        });
    }
});

/**
 * POST /api/calcom/personalized-link
 * Create a personalized booking link for a specific lead
 */
router.post('/personalized-link', async (req, res) => {
    try {
        const { agentId, eventTypeSlug, lead } = req.body;

        if (!agentId || !eventTypeSlug || !lead?.email) {
            return res.status(400).json({
                error: 'Missing required fields: agentId, eventTypeSlug, lead.email'
            });
        }

        const result = await createPersonalizedBookingLink(agentId, eventTypeSlug, lead);
        res.json(result);

    } catch (error) {
        console.error('Personalized link error:', error);
        res.status(500).json({
            error: 'Failed to create personalized link',
            message: error.message
        });
    }
});

/**
 * GET /api/calcom/quick-link/:scenario
 * Get quick booking link for common scenarios
 */
router.get('/quick-link/:scenario', async (req, res) => {
    try {
        const { scenario } = req.params;
        const { agentId } = req.query;

        if (!agentId) {
            return res.status(400).json({
                error: 'Missing required query parameter: agentId'
            });
        }

        const result = await getQuickBookingLink(agentId, scenario);
        res.json(result);

    } catch (error) {
        console.error('Quick link error:', error);
        res.status(500).json({
            error: 'Failed to generate quick link',
            message: error.message
        });
    }
});

/**
 * GET /api/calcom/scenarios
 * Get available booking scenarios
 */
router.get('/scenarios', (req, res) => {
    res.json({
        success: true,
        scenarios: {
            discovery: {
                slug: SCENARIOS.DISCOVERY,
                name: 'Discovery Call',
                description: 'Initial introductory call',
                defaultDuration: 15
            },
            tour: {
                slug: SCENARIOS.PROPERTY_TOUR,
                name: 'Property Tour',
                description: 'Property viewing appointment',
                defaultDuration: 30
            },
            consultation: {
                slug: SCENARIOS.CONSULTATION,
                name: 'Full Consultation',
                description: 'In-depth consultation meeting',
                defaultDuration: 60
            },
            call: {
                slug: SCENARIOS.PHONE_CALL,
                name: 'Phone Call',
                description: 'Quick phone conversation',
                defaultDuration: 15
            },
            meeting: {
                slug: SCENARIOS.MEETING,
                name: 'Meeting',
                description: 'General meeting',
                defaultDuration: 30
            },
            showing: {
                slug: SCENARIOS.SHOWING,
                name: 'Property Showing',
                description: 'Property showing appointment',
                defaultDuration: 45
            }
        }
    });
});

/**
 * GET /api/calcom/slots
 * Get available time slots for an event type
 */
router.get('/slots', async (req, res) => {
    try {
        const { 
            eventTypeId, 
            eventTypeSlug, 
            username, 
            start, 
            end, 
            timeZone,
            duration
        } = req.query;

        if (!start || !end) {
            return res.status(400).json({
                error: 'Missing required parameters: start and end dates'
            });
        }

        const slots = await getAvailableSlots({
            eventTypeId: eventTypeId ? parseInt(eventTypeId) : undefined,
            eventTypeSlug,
            username,
            start,
            end,
            timeZone,
            duration
        });

        res.json({
            success: true,
            slots
        });

    } catch (error) {
        console.error('Get slots error:', error);
        res.status(500).json({
            error: 'Failed to fetch available slots',
            message: error.message
        });
    }
});

/**
 * POST /api/calcom/bookings
 * Create a new booking
 */
router.post('/bookings', async (req, res) => {
    try {
        const {
            eventTypeId,
            start,
            attendee,
            metadata,
            location
        } = req.body;

        if (!eventTypeId || !start || !attendee?.name || !attendee?.email) {
            return res.status(400).json({
                error: 'Missing required fields: eventTypeId, start, attendee.name, attendee.email'
            });
        }

        const booking = await createBooking({
            eventTypeId,
            start,
            attendee,
            metadata,
            location
        });

        res.json({
            success: true,
            booking
        });

    } catch (error) {
        console.error('Create booking error:', error);
        res.status(500).json({
            error: 'Failed to create booking',
            message: error.message
        });
    }
});

/**
 * GET /api/calcom/me
 * Get current Cal.com user profile
 */
router.get('/me', async (req, res) => {
    try {
        const profile = await getMe();
        
        res.json({
            success: true,
            profile
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            error: 'Failed to fetch profile',
            message: error.message
        });
    }
});

/**
 * POST /api/calcom/store-booking-url
 * Store booking URL in agent profile
 */
router.post('/store-booking-url', async (req, res) => {
    try {
        const { agentId, eventTypeId, eventTypeSlug, bookingUrl, config } = req.body;

        if (!agentId || !bookingUrl) {
            return res.status(400).json({
                error: 'Missing required fields: agentId, bookingUrl'
            });
        }

        const { createClient } = require('@supabase/supabase-js');
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return res.status(500).json({
                error: 'Database not configured'
            });
        }

        const supabase = createClient(supabaseUrl, supabaseKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // Update or create agent booking config
        const { data, error } = await supabase
            .from('agent_booking_configs')
            .upsert({
                agent_id: agentId,
                cal_event_type_id: eventTypeId,
                cal_event_type_slug: eventTypeSlug,
                booking_url: bookingUrl,
                is_active: true,
                ...config,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'agent_id,cal_event_type_id'
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        res.json({
            success: true,
            message: 'Booking URL stored successfully',
            agentId,
            bookingUrl,
            config: data
        });

    } catch (error) {
        console.error('Store booking URL error:', error);
        res.status(500).json({
            error: 'Failed to store booking URL',
            message: error.message
        });
    }
});

/**
 * PATCH /api/calcom/config/:configId
 * Update booking configuration
 */
router.patch('/config/:configId', async (req, res) => {
    try {
        const { configId } = req.params;
        const updates = req.body;

        const { updateBookingConfig } = require('../lib/booking-link-service');
        const result = await updateBookingConfig(configId, updates);

        res.json(result);

    } catch (error) {
        console.error('Update config error:', error);
        res.status(500).json({
            error: 'Failed to update configuration',
            message: error.message
        });
    }
});

module.exports = router;
