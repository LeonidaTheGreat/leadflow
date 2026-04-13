const express = require('express');
const SystemStatusService = require('../lib/services/SystemStatusService');

const router = express.Router();
const systemStatusService = new SystemStatusService();

// ─── In-memory rate limiter for health/root endpoints ─────────────────────────
// Tracks request counts per IP per minute. Returns 429 if >60 requests/min.
const RATE_LIMIT_MAX = 60;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const rateLimitCounts = new Map(); // ip -> { count, windowStart }

function healthRateLimit(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = rateLimitCounts.get(ip);

    if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
        rateLimitCounts.set(ip, { count: 1, windowStart: now });
        return next();
    }

    entry.count += 1;
    if (entry.count > RATE_LIMIT_MAX) {
        return res.status(429).json({ error: 'Too Many Requests' });
    }
    return next();
}

// Periodically prune stale entries to prevent unbounded memory growth
setInterval(() => {
    const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS;
    for (const [ip, entry] of rateLimitCounts) {
        if (entry.windowStart < cutoff) rateLimitCounts.delete(ip);
    }
}, RATE_LIMIT_WINDOW_MS);

router.get('/', healthRateLimit, (_req, res) => {
    const response = systemStatusService.getRootStatus();
    return res.json(response);
});

router.get('/health', healthRateLimit, (_req, res) => {
    const response = systemStatusService.getHealthStatus();
    return res.json(response);
});

module.exports = router;
