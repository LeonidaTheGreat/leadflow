-- Register deployed pages in system_components table
-- This ensures all deployed pages are tracked with their URLs

-- Insert or update landing page
INSERT INTO system_components (id, name, type, url, status, metadata, created_at, updated_at)
VALUES (
  'landing-page',
  'Landing Page',
  'web',
  'https://leadflow-ai-five.vercel.app/',
  'live',
  '{"product_id": "landing-page", "deploy_target": "leadflow-ai-five", "description": "Marketing landing page"}'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  url = EXCLUDED.url,
  status = EXCLUDED.status,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

-- Insert or update customer dashboard
INSERT INTO system_components (id, name, type, url, status, metadata, created_at, updated_at)
VALUES (
  'customer-dashboard',
  'Customer Dashboard',
  'web',
  'https://leadflow-ai-five.vercel.app/dashboard',
  'live',
  '{"product_id": "customer-dashboard", "deploy_target": "leadflow-ai-five", "description": "Next.js customer-facing dashboard"}'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  url = EXCLUDED.url,
  status = EXCLUDED.status,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

-- Insert or update login page
INSERT INTO system_components (id, name, type, url, status, metadata, created_at, updated_at)
VALUES (
  'login-page',
  'Login Page',
  'web',
  'https://leadflow-ai-five.vercel.app/login',
  'live',
  '{"product_id": "customer-dashboard", "deploy_target": "leadflow-ai-five", "description": "Email and password login page"}'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  url = EXCLUDED.url,
  status = EXCLUDED.status,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

-- Insert or update FUB webhook API
INSERT INTO system_components (id, name, type, url, status, metadata, created_at, updated_at)
VALUES (
  'fub-webhook',
  'FUB Webhook API',
  'api',
  'https://fub-inbound-webhook.vercel.app',
  'live',
  '{"product_id": "fub-webhook", "deploy_target": "vercel-webhook", "description": "Follow Up Boss inbound webhook processor"}'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  url = EXCLUDED.url,
  status = EXCLUDED.status,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

-- Insert or update health check endpoint
INSERT INTO system_components (id, name, type, url, status, metadata, created_at, updated_at)
VALUES (
  'health-endpoint',
  'Health Check API',
  'api',
  'https://leadflow-ai-five.vercel.app/api/health',
  'live',
  '{"product_id": "customer-dashboard", "deploy_target": "leadflow-ai-five", "description": "Health check endpoint"}'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  url = EXCLUDED.url,
  status = EXCLUDED.status,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

-- Verify registrations
SELECT id, name, type, url, status FROM system_components WHERE type IN ('web', 'api') ORDER BY type, name;
