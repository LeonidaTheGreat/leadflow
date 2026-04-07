/**
 * FUB Webhook Server (Vercel Serverless)
 * Receives real-time lead events from Follow Up Boss
 */

require('dotenv').config();
const express = require('express');
const { router: fubRouter } = require('./integration/fub-webhook-listener');
const weeklyPerformanceRouter = require('./routes/weekly-performance');
const checkStuckPilotsRouter = require('./routes/check-stuck-pilots');
const activationOutreachRouter = require('./routes/admin/activation-outreach');

const app = express();
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'FUB AI Lead Response System',
    webhooks: {
      fub: '/webhook/fub',
    },
    health: '/health'
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    fub: process.env.FUB_API_KEY ? 'configured' : 'missing',
    twilio: process.env.TWILIO_ACCOUNT_SID ? 'configured' : 'missing'
  });
});

// FUB webhook routes
app.use('/', fubRouter);

// Weekly performance email routes
app.use('/', weeklyPerformanceRouter);

// Stuck pilots cron route (checks pilot_progress, not onboarding_events)
app.use('/', checkStuckPilotsRouter);

// Admin: activation outreach (personal email to verified but unactivated signups)
app.use('/', activationOutreachRouter);

// Local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Local server: http://localhost:${PORT}`);
  });
}

// Export for Vercel serverless
module.exports = app;
