'use strict';

const express = require('express');
const FUBService = require('../lib/services/FUBService');

const router = express.Router();
const fubService = new FUBService();

router.post('/webhook/fub', (req, res) => {
  try {
    const result = fubService.handleWebhookPayload(req.body || {});
    return res.status(200).json(result);
  } catch (error) {
    console.error('❌ Failed to process FUB webhook:', error.message);
    return res.status(500).json({
      received: false,
      error: 'Failed to process webhook payload'
    });
  }
});

module.exports = {
  router,
  fubService,
  fubEventBus: fubService.eventBus,
  verifyFubWebhookSignature: (req) => fubService.verifyWebhookSignature(req)
};
