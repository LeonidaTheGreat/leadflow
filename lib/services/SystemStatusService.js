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
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      fub: process.env.FUB_API_KEY ? 'configured' : 'missing',
      twilio: process.env.TWILIO_ACCOUNT_SID ? 'configured' : 'missing'
    };
  }
}

module.exports = SystemStatusService;
