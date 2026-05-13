/**
 * Booking Links Routes
 *
 * All endpoints require LEADFLOW_API_KEY via x-api-key header.
 *
 *   GET  /api/booking-links?agentId=<id>                     — get all active booking links for an agent
 *   POST /api/booking-links                                   — generate/upsert a booking link
 *   POST /api/booking-links/personalized                      — create a lead-prefilled booking link
 *   GET  /api/booking-links/quick?agentId=<id>&scenario=<s>  — quick link by scenario shorthand
 *   PATCH /api/booking-links/:id                              — update booking config fields
 *   DELETE /api/booking-links/:id                             — deactivate a booking link
 */

'use strict';

const express = require('express');
const router = express.Router();
const BookingLinkService = require('../lib/services/BookingLinkService');
const requireApiKey = require('../lib/middleware/require-api-key');
const { logger } = require('../lib/logger');
const { ValidationError } = require('../lib/errors');
const log = logger.child('booking-links');

const service = new BookingLinkService();

// ─── GET /api/booking-links ───────────────────────────────────────────────────
router.get('/api/booking-links', requireApiKey, async (req, res) => {
    try {
        const { agentId } = req.query;
        if (!agentId || typeof agentId !== 'string' || !agentId.trim()) {
            throw new ValidationError('agentId is required');
        }
        const result = await service.getAgentBookingLinks(agentId.trim());
        return res.json(result);
    } catch (err) {
        if (err instanceof ValidationError) {
            return res.status(400).json({ error: err.message });
        }
        log.error('Get booking links error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── GET /api/booking-links/quick ────────────────────────────────────────────
router.get('/api/booking-links/quick', requireApiKey, async (req, res) => {
    try {
        const { agentId, scenario } = req.query;
        if (!agentId || typeof agentId !== 'string' || !agentId.trim()) {
            throw new ValidationError('agentId is required');
        }
        if (!scenario || typeof scenario !== 'string' || !scenario.trim()) {
            throw new ValidationError('scenario is required');
        }
        const result = await service.getQuickBookingLink(agentId.trim(), scenario.trim());
        return res.json(result);
    } catch (err) {
        if (err instanceof ValidationError) {
            return res.status(400).json({ error: err.message });
        }
        log.error('Quick booking link error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── POST /api/booking-links ──────────────────────────────────────────────────
router.post('/api/booking-links', requireApiKey, async (req, res) => {
    try {
        const { agentId, eventTypeSlug, prefill, utmSource } = req.body || {};
        if (!agentId || typeof agentId !== 'string' || !agentId.trim()) {
            throw new ValidationError('agentId is required');
        }
        if (!eventTypeSlug || typeof eventTypeSlug !== 'string' || !eventTypeSlug.trim()) {
            throw new ValidationError('eventTypeSlug is required');
        }
        const options = {};
        if (prefill && typeof prefill === 'object') options.prefill = prefill;
        if (utmSource && typeof utmSource === 'string') options.utmSource = utmSource;

        const result = await service.generateAgentBookingLink(
            agentId.trim(),
            eventTypeSlug.trim(),
            options
        );
        return res.status(201).json(result);
    } catch (err) {
        if (err instanceof ValidationError) {
            return res.status(400).json({ error: err.message });
        }
        log.error('Generate booking link error', err);
        const status = err.message && err.message.includes('not found') ? 404 : 500;
        return res.status(status).json({ error: status === 404 ? err.message : 'Internal server error' });
    }
});

// ─── POST /api/booking-links/personalized ────────────────────────────────────
router.post('/api/booking-links/personalized', requireApiKey, async (req, res) => {
    try {
        const { agentId, eventTypeSlug, lead } = req.body || {};
        if (!agentId || typeof agentId !== 'string' || !agentId.trim()) {
            throw new ValidationError('agentId is required');
        }
        if (!eventTypeSlug || typeof eventTypeSlug !== 'string' || !eventTypeSlug.trim()) {
            throw new ValidationError('eventTypeSlug is required');
        }
        if (!lead || typeof lead !== 'object') {
            throw new ValidationError('lead is required and must be an object');
        }
        if (!lead.name || typeof lead.name !== 'string' || !lead.name.trim()) {
            throw new ValidationError('lead.name is required');
        }
        if (!lead.email || typeof lead.email !== 'string' || !lead.email.trim()) {
            throw new ValidationError('lead.email is required');
        }

        const result = await service.createPersonalizedBookingLink(
            agentId.trim(),
            eventTypeSlug.trim(),
            lead
        );
        return res.status(201).json(result);
    } catch (err) {
        if (err instanceof ValidationError) {
            return res.status(400).json({ error: err.message });
        }
        log.error('Personalized booking link error', err);
        const status = err.message && err.message.includes('not found') ? 404 : 500;
        return res.status(status).json({ error: status === 404 ? err.message : 'Internal server error' });
    }
});

// ─── PATCH /api/booking-links/:id ────────────────────────────────────────────
router.patch('/api/booking-links/:id', requireApiKey, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body || {};
        if (!id || !id.trim()) {
            throw new ValidationError('id is required');
        }
        if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
            throw new ValidationError('Request body must contain at least one field to update');
        }
        const result = await service.updateBookingConfig(id.trim(), updates);
        return res.json(result);
    } catch (err) {
        if (err instanceof ValidationError) {
            return res.status(400).json({ error: err.message });
        }
        log.error('Update booking config error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── DELETE /api/booking-links/:id ───────────────────────────────────────────
router.delete('/api/booking-links/:id', requireApiKey, async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || !id.trim()) {
            throw new ValidationError('id is required');
        }
        const result = await service.deactivateBookingLink(id.trim());
        return res.json(result);
    } catch (err) {
        if (err instanceof ValidationError) {
            return res.status(400).json({ error: err.message });
        }
        log.error('Deactivate booking link error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
