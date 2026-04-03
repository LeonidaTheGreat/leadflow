-- Auto-generated: Stripe Billing Decomposition
-- Created: 2026-02-25
-- Total Cost: $4.80, Budget Available: $15.00

-- Subtask 1: Foundation (EXECUTE IMMEDIATELY)
INSERT INTO tasks (
  id, title, description, status, priority, 
  agent_id, model, estimated_hours, estimated_cost_usd,
  acceptance_criteria, created_at, sequence_order
) VALUES (
  'stripe-001-setup',
  'Stripe Billing - Project Setup & npm Scripts',
  'Set up proper npm scripts (build, lint, test, typecheck) and project structure for Stripe integration. Fix missing package.json scripts that caused previous failures.',
  'ready',
  2,
  'dev',
  'kimi',
  1,
  0.30,
  ARRAY[
    'npm run build executes without errors',
    'npm run lint executes without errors',
    'npm run test executes without errors',
    'npx tsc --noEmit passes (typecheck)',
    'All scripts defined in package.json'
  ],
  NOW(),
  1
);

-- Subtask 2: Core Integration (BLOCKED until setup complete)
INSERT INTO tasks (
  id, title, description, status, priority,
  agent_id, model, estimated_hours, estimated_cost_usd,
  acceptance_criteria, dependencies, created_at, sequence_order
) VALUES (
  'stripe-002-core',
  'Stripe Billing - Core Integration',
  'Implement Stripe billing logic: customer creation, subscription management, webhook handling. Depends on project setup completion.',
  'blocked',
  2,
  'dev',
  'sonnet',
  2,
  4.00,
  ARRAY[
    'Stripe customer created on agent signup',
    'Subscription created with correct plan',
    'Webhook endpoint handles stripe events',
    'Payment method attached to customer',
    'Error handling for failed payments'
  ],
  ARRAY['stripe-001-setup'],
  NOW(),
  2
);

-- Subtask 3: Tests (BLOCKED until core complete)
INSERT INTO tasks (
  id, title, description, status, priority,
  agent_id, model, estimated_hours, estimated_cost_usd,
  acceptance_criteria, dependencies, created_at, sequence_order
) VALUES (
  'stripe-003-tests',
  'Stripe Billing - Tests & Validation',
  'Add comprehensive tests for Stripe integration: unit tests for billing logic, integration tests for webhooks, validation of error scenarios.',
  'blocked',
  2,
  'qc',
  'haiku',
  1,
  0.50,
  ARRAY[
    'Unit tests for billing functions (>80% coverage)',
    'Integration tests for webhook handling',
    'Test for failed payment scenarios',
    'Test for subscription cancellation',
    'All tests pass in CI'
  ],
  ARRAY['stripe-002-core'],
  NOW(),
  3
);

-- Mark original task as superseded
UPDATE tasks SET 
  status = 'superseded',
  superseded_by = ARRAY['stripe-001-setup', 'stripe-002-core', 'stripe-003-tests'],
  updated_at = NOW()
WHERE id = '943086cf-7f5b-43f5-8502-4daa4be8fee4';
