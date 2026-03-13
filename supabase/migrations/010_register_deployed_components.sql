-- Register deployed pages in system_components table
-- This ensures all deployed pages are tracked with their URLs
-- Uses correct column names: component_name (not name), category (not type), metadata.url (not top-level url)

-- Insert or update landing page
INSERT INTO system_components (id, project_id, component_name, category, status, status_emoji, metadata, last_checked)
VALUES (
  '11111111-1111-4111-a111-111111111111',
  'leadflow',
  'Landing Page',
  'web',
  'live',
  '🟢',
  '{"product_id": "landing-page", "deploy_target": "leadflow-ai-five", "url": "https://leadflow-ai-five.vercel.app/", "description": "Marketing landing page"}'::jsonb,
  NOW()
)
ON CONFLICT (project_id, component_name) DO UPDATE SET
  status = EXCLUDED.status,
  status_emoji = EXCLUDED.status_emoji,
  metadata = EXCLUDED.metadata,
  last_checked = NOW();

-- Insert or update customer dashboard
INSERT INTO system_components (id, project_id, component_name, category, status, status_emoji, metadata, last_checked)
VALUES (
  '22222222-2222-4222-a222-222222222222',
  'leadflow',
  'Customer Dashboard',
  'web',
  'live',
  '🟢',
  '{"product_id": "customer-dashboard", "deploy_target": "leadflow-ai-five", "url": "https://leadflow-ai-five.vercel.app/dashboard", "description": "Next.js customer-facing dashboard"}'::jsonb,
  NOW()
)
ON CONFLICT (project_id, component_name) DO UPDATE SET
  status = EXCLUDED.status,
  status_emoji = EXCLUDED.status_emoji,
  metadata = EXCLUDED.metadata,
  last_checked = NOW();

-- Insert or update login page
INSERT INTO system_components (id, project_id, component_name, category, status, status_emoji, metadata, last_checked)
VALUES (
  '33333333-3333-4333-a333-333333333333',
  'leadflow',
  'Login Page',
  'web',
  'live',
  '🟢',
  '{"product_id": "customer-dashboard", "deploy_target": "leadflow-ai-five", "url": "https://leadflow-ai-five.vercel.app/login", "description": "Email and password login page"}'::jsonb,
  NOW()
)
ON CONFLICT (project_id, component_name) DO UPDATE SET
  status = EXCLUDED.status,
  status_emoji = EXCLUDED.status_emoji,
  metadata = EXCLUDED.metadata,
  last_checked = NOW();

-- Insert or update FUB webhook API
INSERT INTO system_components (id, project_id, component_name, category, status, status_emoji, metadata, last_checked)
VALUES (
  '44444444-4444-4444-a444-444444444444',
  'leadflow',
  'FUB Webhook API',
  'api',
  'live',
  '🟢',
  '{"product_id": "fub-webhook", "deploy_target": "vercel-webhook", "url": "https://fub-inbound-webhook.vercel.app", "description": "Follow Up Boss inbound webhook processor"}'::jsonb,
  NOW()
)
ON CONFLICT (project_id, component_name) DO UPDATE SET
  status = EXCLUDED.status,
  status_emoji = EXCLUDED.status_emoji,
  metadata = EXCLUDED.metadata,
  last_checked = NOW();

-- Insert or update health check endpoint
INSERT INTO system_components (id, project_id, component_name, category, status, status_emoji, metadata, last_checked)
VALUES (
  '55555555-5555-4555-a555-555555555555',
  'leadflow',
  'Health Check API',
  'api',
  'live',
  '🟢',
  '{"product_id": "customer-dashboard", "deploy_target": "leadflow-ai-five", "url": "https://leadflow-ai-five.vercel.app/api/health", "description": "Health check endpoint"}'::jsonb,
  NOW()
)
ON CONFLICT (project_id, component_name) DO UPDATE SET
  status = EXCLUDED.status,
  status_emoji = EXCLUDED.status_emoji,
  metadata = EXCLUDED.metadata,
  last_checked = NOW();

-- Verify registrations
SELECT id, component_name, category, status, status_emoji FROM system_components WHERE category IN ('web', 'api') ORDER BY category, component_name;
