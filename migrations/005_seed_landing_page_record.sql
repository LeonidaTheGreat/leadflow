-- Migration 005: Seed Landing Page Distribution Channel
-- Adds a record for the main LeadFlow landing page channel

INSERT INTO distribution_channels 
  (project_id, channel_type, name, status)
VALUES 
  ('leadflow', 'landing_page', 'LeadFlow Marketing Site', 'active')
ON CONFLICT DO NOTHING;
