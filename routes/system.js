const express = require('express');
const SystemStatusService = require('../lib/services/SystemStatusService');

const router = express.Router();
const systemStatusService = new SystemStatusService();

router.get('/', (_req, res) => {
    const response = systemStatusService.getRootStatus();
    return res.json(response);
});

router.get('/health', (_req, res) => {
    const response = systemStatusService.getHealthStatus();
    return res.json(response);
});

module.exports = router;
