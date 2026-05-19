class SystemStatusService {
  getRootStatus() {
    return {
      status: 'ok',
      service: 'FUB AI Lead Response System',
      webhooks: {
        fub: '/webhook/fub'
      },
      health: '/health'
    };
  }

  getHealthStatus() {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY ? 'configured' : 'missing';
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET ? 'configured' : 'missing';
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      fub: process.env.FUB_API_KEY ? 'configured' : 'missing',
      twilio: process.env.TWILIO_ACCOUNT_SID ? 'configured' : 'missing',
      stripe_secret_key: stripeSecretKey,
      stripe_webhook_secret: stripeWebhookSecret,
    };
  }
}

module.exports = SystemStatusService;
