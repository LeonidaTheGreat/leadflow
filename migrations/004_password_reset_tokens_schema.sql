-- Migration 004: Update password_reset_tokens schema
-- Created: 2026-04-04
-- Refactors password_reset_tokens to use agent_id FK and token_hash
-- for consistency with auth patterns.

-- Add new columns if they don't exist
ALTER TABLE password_reset_tokens ADD COLUMN IF NOT EXISTS agent_id UUID;
ALTER TABLE password_reset_tokens ADD COLUMN IF NOT EXISTS token_hash TEXT;
ALTER TABLE password_reset_tokens ADD COLUMN IF NOT EXISTS used BOOLEAN DEFAULT false;

-- Migrate data from email to agent_id (FK lookup)
UPDATE password_reset_tokens prt
SET agent_id = ra.id
FROM real_estate_agents ra
WHERE prt.email = ra.email AND prt.agent_id IS NULL;

-- Migrate data from token to token_hash (they're already stored raw, so copy directly)
UPDATE password_reset_tokens
SET token_hash = token
WHERE token_hash IS NULL AND token IS NOT NULL;

-- Migrate data from used_at to used
UPDATE password_reset_tokens
SET used = true
WHERE used IS NULL AND used_at IS NOT NULL;

UPDATE password_reset_tokens
SET used = false
WHERE used IS NULL;

-- Add foreign key constraint
ALTER TABLE password_reset_tokens
ADD CONSTRAINT password_reset_tokens_agent_id_fk
FOREIGN KEY (agent_id) REFERENCES real_estate_agents(id) ON DELETE CASCADE;

-- Add unique constraint on token_hash
ALTER TABLE password_reset_tokens
ADD CONSTRAINT password_reset_tokens_token_hash_key UNIQUE (token_hash);

-- Make the new columns NOT NULL
ALTER TABLE password_reset_tokens
ALTER COLUMN agent_id SET NOT NULL,
ALTER COLUMN token_hash SET NOT NULL,
ALTER COLUMN used SET NOT NULL;

-- Drop the old columns (can be done in a second migration if desired for safety)
-- ALTER TABLE password_reset_tokens DROP COLUMN IF EXISTS email CASCADE;
-- ALTER TABLE password_reset_tokens DROP COLUMN IF EXISTS token CASCADE;
-- ALTER TABLE password_reset_tokens DROP COLUMN IF EXISTS used_at CASCADE;

-- DOWN
-- Restore the old columns and data
ALTER TABLE password_reset_tokens
ALTER COLUMN agent_id DROP NOT NULL,
ALTER COLUMN token_hash DROP NOT NULL,
ALTER COLUMN used DROP NOT NULL;

ALTER TABLE password_reset_tokens
DROP CONSTRAINT IF EXISTS password_reset_tokens_agent_id_fk CASCADE;

ALTER TABLE password_reset_tokens
DROP CONSTRAINT IF EXISTS password_reset_tokens_token_hash_key;

-- Migration can be rolled back, but data restoration would require careful handling
-- For now, just undo the schema changes above
