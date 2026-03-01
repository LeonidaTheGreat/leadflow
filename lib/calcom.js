/**
 * Cal.com API Client
 * Handles booking link integration for agents
 * API Docs: https://cal.com/docs/api-reference/v2/introduction
 */

const axios = require('axios');

// Cal.com API Configuration
const CAL_API_BASE_URL = 'https://api.cal.com/v2';

/**
 * Get Cal.com API key from environment
 */
function getApiKey() {
    return process.env.CAL_API_KEY || null;
}

/**
 * Check if Cal.com is configured
 */
function isConfigured() {
    return !!getApiKey();
}

/**
 * Make authenticated request to Cal.com API
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {Object} options - Request options
 * @returns {Promise<Object>} API response
 */
async function calApiRequest(endpoint, options = {}) {
    const apiKey = getApiKey();
    
    if (!apiKey) {
        throw new Error('Cal.com API key not configured. Set CAL_API_KEY environment variable.');
    }

    const url = `${CAL_API_BASE_URL}${endpoint}`;
    
    const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers
    };

    // Add version header based on endpoint
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

/**
 * Get all event types (booking link templates) for the authenticated user
 * @param {Object} filters - Optional filters
 * @param {string} filters.username - Filter by specific username
 * @param {string} filters.eventSlug - Get specific event type by slug
 * @param {string} filters.orgSlug - Filter by organization slug
 * @returns {Promise<Array>} Array of event types with booking URLs
 */
async function getEventTypes(filters = {}) {
    if (!isConfigured()) {
        console.warn('Cal.com not configured - returning mock data');
        return getMockEventTypes();
    }

    try {
        const params = {};
        if (filters.username) params.username = filters.username;
        if (filters.eventSlug) params.eventSlug = filters.eventSlug;
        if (filters.orgSlug) params.orgSlug = filters.orgSlug;

        const data = await calApiRequest('/event-types', { params });
        
        // Transform response to include booking URLs
        const eventTypes = data.data || data.eventTypes || [];
        
        return eventTypes.map(eventType => ({
            id: eventType.id,
            slug: eventType.slug,
            title: eventType.title,
            description: eventType.description,
            duration: eventType.length, // in minutes
            bookingUrl: eventType.link || generateBookingUrl(eventType.slug, filters.username),
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
        console.error('Error fetching event types:', error.message);
        // Return mock data on error for development
        if (process.env.NODE_ENV !== 'production') {
            return getMockEventTypes();
        }
        throw error;
    }
}

/**
 * Get a single event type by ID
 * @param {number} eventTypeId - Event type ID
 * @returns {Promise<Object>} Event type details
 */
async function getEventType(eventTypeId) {
    if (!isConfigured()) {
        const mock = getMockEventTypes().find(et => et.id === eventTypeId);
        return mock || getMockEventTypes()[0];
    }

    const data = await calApiRequest(`/event-types/${eventTypeId}`);
    return data.data || data;
}

/**
 * Generate booking URL from event type
 * @param {string} eventSlug - Event type slug
 * @param {string} username - Cal.com username
 * @returns {string} Booking URL
 */
function generateBookingUrl(eventSlug, username) {
    const calUsername = username || process.env.CAL_USERNAME;
    
    if (!calUsername) {
        console.warn('CAL_USERNAME not configured - cannot generate booking URL');
        return null;
    }
    
    return `https://cal.com/${calUsername}/${eventSlug}`;
}

/**
 * Get available time slots for an event type
 * @param {Object} params - Slot query parameters
 * @param {number} params.eventTypeId - Event type ID
 * @param {string} params.eventTypeSlug - Event type slug (alternative to ID)
 * @param {string} params.username - Username (required with slug)
 * @param {string} params.start - Start date (ISO 8601)
 * @param {string} params.end - End date (ISO 8601)
 * @param {string} params.timeZone - Timezone for slots (default: UTC)
 * @param {string} params.duration - Override duration in minutes
 * @returns {Promise<Object>} Available slots
 */
async function getAvailableSlots(params) {
    if (!isConfigured()) {
        console.warn('Cal.com not configured - returning mock slots');
        return getMockSlots();
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

    return await calApiRequest('/slots', { params: queryParams });
}

/**
 * Create a booking
 * @param {Object} bookingData - Booking data
 * @param {number} bookingData.eventTypeId - Event type ID
 * @param {string} bookingData.start - Start time in UTC (ISO 8601)
 * @param {Object} bookingData.attendee - Attendee info
 * @param {string} bookingData.attendee.name - Attendee name
 * @param {string} bookingData.attendee.email - Attendee email
 * @param {string} bookingData.attendee.phoneNumber - Optional phone
 * @param {string} bookingData.attendee.timeZone - Attendee timezone
 * @param {Object} bookingData.metadata - Optional metadata
 * @param {Object} bookingData.location - Optional location override
 * @returns {Promise<Object>} Created booking
 */
async function createBooking(bookingData) {
    if (!isConfigured()) {
        console.warn('Cal.com not configured - returning mock booking');
        return getMockBooking(bookingData);
    }

    const payload = {
        eventTypeId: bookingData.eventTypeId,
        start: bookingData.start,
        attendee: {
            name: bookingData.attendee.name,
            email: bookingData.attendee.email,
            ...(bookingData.attendee.phoneNumber && {
                phoneNumber: bookingData.attendee.phoneNumber
            }),
            ...(bookingData.attendee.timeZone && {
                timeZone: bookingData.attendee.timeZone
            })
        },
        instant: false,
        metadata: bookingData.metadata || {}
    };

    if (bookingData.location) {
        payload.location = bookingData.location;
    }

    return await calApiRequest('/bookings', {
        method: 'POST',
        body: payload
    });
}

/**
 * Get a booking by ID or UID
 * @param {string} bookingId - Booking ID or UID
 * @returns {Promise<Object>} Booking details
 */
async function getBooking(bookingId) {
    if (!isConfigured()) {
        return getMockBooking({ id: bookingId });
    }

    return await calApiRequest(`/bookings/${bookingId}`);
}

/**
 * Cancel a booking
 * @param {string} bookingId - Booking ID or UID
 * @param {Object} options - Cancel options
 * @param {string} options.reason - Cancellation reason
 * @returns {Promise<Object>} Cancelled booking
 */
async function cancelBooking(bookingId, options = {}) {
    if (!isConfigured()) {
        console.log('Mock: Booking cancelled');
        return { id: bookingId, status: 'cancelled', mock: true };
    }

    const payload = {
        reason: options.reason || 'Cancelled by user'
    };

    return await calApiRequest(`/bookings/${bookingId}/cancel`, {
        method: 'POST',
        body: payload
    });
}

/**
 * Reschedule a booking
 * @param {string} bookingId - Booking ID or UID
 * @param {Object} rescheduleData - Reschedule data
 * @param {string} rescheduleData.start - New start time
 * @param {string} rescheduleData.reason - Reason for reschedule
 * @returns {Promise<Object>} Rescheduled booking
 */
async function rescheduleBooking(bookingId, rescheduleData) {
    if (!isConfigured()) {
        console.log('Mock: Booking rescheduled');
        return {
            id: bookingId,
            status: 'rescheduled',
            startTime: rescheduleData.start,
            mock: true
        };
    }

    return await calApiRequest(`/bookings/${bookingId}/reschedule`, {
        method: 'POST',
        body: {
            start: rescheduleData.start,
            reason: rescheduleData.reason
        }
    });
}

/**
 * Get current user profile
 * @returns {Promise<Object>} User profile
 */
async function getMe() {
    if (!isConfigured()) {
        return { 
            username: process.env.CAL_USERNAME || 'mock_user', 
            mock: true 
        };
    }

    try {
        return await calApiRequest('/me');
    } catch (error) {
        // Fallback if /me endpoint fails
        return {
            username: process.env.CAL_USERNAME,
            error: error.message
        };
    }
}

/**
 * Get team members (if using team account)
 * @returns {Promise<Array>} Team members
 */
async function getTeamMembers() {
    if (!isConfigured()) {
        return [];
    }

    try {
        const data = await calApiRequest('/teams');
        return data.data || [];
    } catch (error) {
        console.warn('Could not fetch team members:', error.message);
        return [];
    }
}

// ============== MOCK DATA (for development/testing) ==============

function getMockEventTypes() {
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

function getMockSlots() {
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

function getMockBooking(bookingData) {
    const duration = bookingData.duration || 30;
    const startTime = bookingData.start || new Date().toISOString();
    const endTime = new Date(new Date(startTime).getTime() + duration * 60 * 1000).toISOString();

    return {
        id: bookingData.id || `mock_booking_${Date.now()}`,
        uid: `mock_uid_${Date.now()}`,
        status: 'accepted',
        startTime: startTime,
        endTime: endTime,
        attendee: bookingData.attendee || { name: 'Test User', email: 'test@example.com' },
        eventTypeId: bookingData.eventTypeId || 1,
        metadata: bookingData.metadata || {},
        mock: true
    };
}

module.exports = {
    // API Methods
    getEventTypes,
    getEventType,
    getAvailableSlots,
    createBooking,
    getBooking,
    cancelBooking,
    rescheduleBooking,
    getMe,
    getTeamMembers,
    
    // Utilities
    isConfigured,
    generateBookingUrl,
    
    // Config
    CAL_API_BASE_URL
};
