/**
 * FUB Webhook Server (Vercel Serverless)
 * Receives real-time lead events from Follow Up Boss
 */

require('dotenv').config();
const express = require('express');
const { router: fubRouter } = require('./integration/fub-webhook-listener');
const twilioInboundRouter = require('./integration/twilio-inbound-sms');

const app = express();
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'FUB AI Lead Response System',
    webhooks: {
      fub: '/webhook/fub',
      twilio_inbound: '/webhook/twilio/inbound'
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

// Twilio inbound SMS routes (UC-5: Lead Opt-Out)
app.use('/', twilioInboundRouter);

// Local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Local server: http://localhost:${PORT}`);
  });
}

// Export for Vercel serverless
module.exports = app;
