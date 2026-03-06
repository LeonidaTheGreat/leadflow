/**
 * Register Deployed Components
 * 
 * This script registers all deployed pages in the system_components table
 * with their URLs and metadata.
 */

const DEPLOYED_COMPONENTS = [
  {
    id: 'landing-page',
    name: 'Landing Page',
    type: 'web',
    url: 'https://leadflow-ai-five.vercel.app/',
    status: 'live',
    product_id: 'landing-page',
    description: 'Marketing landing page'
  },
  {
    id: 'customer-dashboard',
    name: 'Customer Dashboard',
    type: 'web',
    url: 'https://leadflow-ai-five.vercel.app/dashboard',
    status: 'live',
    product_id: 'customer-dashboard',
    description: 'Next.js customer-facing dashboard'
  },
  {
    id: 'login-page',
    name: 'Login Page',
    type: 'web',
    url: 'https://leadflow-ai-five.vercel.app/login',
    status: 'live',
    product_id: 'customer-dashboard',
    description: 'Email and password login page'
  },
  {
    id: 'onboarding-page',
    name: 'Onboarding Page',
    type: 'web',
    url: 'https://leadflow-ai-five.vercel.app/onboarding',
    status: 'live',
    product_id: 'customer-dashboard',
    description: 'User onboarding and signup flow'
  },
  {
    id: 'fub-webhook',
    name: 'FUB Webhook API',
    type: 'api',
    url: 'https://fub-inbound-webhook.vercel.app',
    status: 'live',
    product_id: 'fub-webhook',
    description: 'Follow Up Boss inbound webhook processor'
  },
  {
    id: 'health-endpoint',
    name: 'Health Check API',
    type: 'api',
    url: 'https://leadflow-ai-five.vercel.app/api/health',
    status: 'live',
    product_id: 'customer-dashboard',
    description: 'Health check endpoint'
  },
  {
    id: 'pilot-signup-api',
    name: 'Pilot Signup API',
    type: 'api',
    url: 'https://leadflow-ai-five.vercel.app/api/pilot-signup',
    status: 'live',
    product_id: 'landing-page',
    description: 'Pilot program signup endpoint'
  }
];

module.exports = { DEPLOYED_COMPONENTS };

// If run directly, log the components
if (require.main === module) {
  console.log('Deployed Components to Register:');
  console.log('================================');
  DEPLOYED_COMPONENTS.forEach(comp => {
    console.log(`${comp.name} (${comp.type})`);
    console.log(`  URL: ${comp.url}`);
    console.log(`  Status: ${comp.status}`);
    console.log('');
  });
}
