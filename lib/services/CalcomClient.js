/**
 * Cal.com API Client
 * Handles booking link integration for agents
 * API Docs: https://cal.com/docs/api-reference/v2/introduction
 */

const axios = require('axios');

const CAL_API_BASE_URL = 'https://api.cal.com/v2';
const CAL_REQUEST_TIMEOUT_MS = 30000;

class CalcomClient {
    constructor(options = {}) {
        this.httpClient = options.httpClient || axios;
        this.apiBaseUrl = options.apiBaseUrl || CAL_API_BASE_URL;
        this.apiKey = options.apiKey || null;
        this.defaultUsername = options.defaultUsername || null;
        this.logger = options.logger || console;
    }

    getApiKey() {
        return this.apiKey || process.env.CAL_API_KEY || null;
    }

    isConfigured() {
        return !!this.getApiKey();
    }

    async calApiRequest(endpoint, options = {}) {
        const apiKey = this.getApiKey();

        if (!apiKey) {
            throw new Error('Cal.com API key not configured. Set CAL_API_KEY environment variable.');
        }

        const url = `${this.apiBaseUrl}${endpoint}`;
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
            const response = await this.httpClient({
                url,
                method: options.method || 'GET',
                headers,
                data: options.body,
                params: options.params,
                timeout: CAL_REQUEST_TIMEOUT_MS
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
            return getMockEventTypes(this.defaultUsername);
        }

        try {
            const params = {};
            if (filters.username) params.username = filters.username;
            if (filters.eventSlug) params.eventSlug = filters.eventSlug;
            if (filters.orgSlug) params.orgSlug = filters.orgSlug;

            const data = await this.calApiRequest('/event-types', { params });
            const eventTypes = data.data || data.eventTypes || [];

            return eventTypes.map((eventType) => ({
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
                return getMockEventTypes(this.defaultUsername);
            }
            throw error;
        }
    }

    async getEventType(eventTypeId) {
        if (!this.isConfigured()) {
            const mock = getMockEventTypes(this.defaultUsername).find((eventType) => eventType.id === eventTypeId);
            return mock || getMockEventTypes(this.defaultUsername)[0];
        }

        const data = await this.calApiRequest(`/event-types/${eventTypeId}`);
        return data.data || data;
    }

    generateBookingUrl(eventSlug, username) {
        const calUsername = username || process.env.CAL_USERNAME || this.defaultUsername;

        if (!calUsername) {
            this.logger.warn('CAL_USERNAME not configured - cannot generate booking URL');
            return null;
        }

        return `https://cal.com/${calUsername}/${eventSlug}`;
    }

    async getAvailableSlots(params) {
        if (!this.isConfigured()) {
            this.logger.warn('Cal.com not configured - returning mock slots');
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

        return this.calApiRequest('/slots', { params: queryParams });
    }

    async createBooking(bookingData) {
        if (!this.isConfigured()) {
            this.logger.warn('Cal.com not configured - returning mock booking');
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

        return this.calApiRequest('/bookings', {
            method: 'POST',
            body: payload
        });
    }

    async getBooking(bookingId) {
        if (!this.isConfigured()) {
            return getMockBooking({ id: bookingId });
        }

        return this.calApiRequest(`/bookings/${bookingId}`);
    }

    async cancelBooking(bookingId, options = {}) {
        if (!this.isConfigured()) {
            this.logger.log('Mock: Booking cancelled');
            return { id: bookingId, status: 'cancelled', mock: true };
        }

        const payload = {
            reason: options.reason || 'Cancelled by user'
        };

        return this.calApiRequest(`/bookings/${bookingId}/cancel`, {
            method: 'POST',
            body: payload
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
                username: this.defaultUsername || 'mock_user',
                mock: true
            };
        }

        try {
            return await this.calApiRequest('/me');
        } catch (error) {
            return {
                username: this.defaultUsername,
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
}

function getMockEventTypes(defaultUsername = process.env.CAL_USERNAME) {
    const username = defaultUsername || 'demo';

    return [
        {
            id: 1,
            slug: 'discovery-call',
            title: 'Discovery Call',
            description: '15-minute introductory call to learn about your real estate needs',
            duration: 15,
            bookingUrl: `https://cal.com/${username}/discovery-call`,
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
            bookingUrl: `https://cal.com/${username}/property-tour`,
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
            bookingUrl: `https://cal.com/${username}/consultation`,
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
            bookingUrl: `https://cal.com/${username}/buyer-consultation`,
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
            bookingUrl: `https://cal.com/${username}/seller-consultation`,
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
    for (let i = 0; i < 8; i += 1) {
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

function getMockBooking(bookingData = {}) {
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

const defaultCalcomClient = new CalcomClient();

module.exports = CalcomClient;
module.exports.CAL_API_BASE_URL = CAL_API_BASE_URL;

module.exports.getEventTypes = (...args) => defaultCalcomClient.getEventTypes(...args);
module.exports.getEventType = (...args) => defaultCalcomClient.getEventType(...args);
module.exports.getAvailableSlots = (...args) => defaultCalcomClient.getAvailableSlots(...args);
module.exports.createBooking = (...args) => defaultCalcomClient.createBooking(...args);
module.exports.getBooking = (...args) => defaultCalcomClient.getBooking(...args);
module.exports.cancelBooking = (...args) => defaultCalcomClient.cancelBooking(...args);
module.exports.rescheduleBooking = (...args) => defaultCalcomClient.rescheduleBooking(...args);
module.exports.getMe = (...args) => defaultCalcomClient.getMe(...args);
module.exports.getTeamMembers = (...args) => defaultCalcomClient.getTeamMembers(...args);
module.exports.isConfigured = (...args) => defaultCalcomClient.isConfigured(...args);
module.exports.generateBookingUrl = (...args) => defaultCalcomClient.generateBookingUrl(...args);
