'use strict';

// Recommended vercel.json cron: { "path": "/api/cron/dead-letter-replay", "schedule": "0 */6 * * *" }
// (every 6 hours — adjust based on webhook volume)

const express = require('express');
const router = express.Router();
const requireCronSecret = require('../../lib/middleware/require-cron-secret');
const { logger } = require('../../lib/logger');
const log = logger.child('dead-letter-replay');

router.get('/api/cron/dead-letter-replay', requireCronSecret, async (req, res) => {
  log.info('Dead letter replay cron triggered');

  try {
    const { getPool } = require('../../lib/db');
    const { DeadLetterReplay } = require('../../lib/utils/dead-letter-replay');
    const replay = new DeadLetterReplay(getPool());
    const result = await replay.run();

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    log.error('Dead letter replay failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
