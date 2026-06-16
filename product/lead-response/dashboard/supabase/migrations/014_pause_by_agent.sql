-- UC-buyer-journey: Add paused_by_agent status
-- When a human agent sends an outbound message, AI sequences pause with paused_by_agent
-- (distinct from 'paused' which means the LEAD replied)

-- Extend the status CHECK constraint to include the new status
ALTER TABLE lead_sequences
  DROP CONSTRAINT IF EXISTS lead_sequences_status_check;

ALTER TABLE lead_sequences
  ADD CONSTRAINT lead_sequences_status_check CHECK (status IN (
    'active',
    'paused',
    'paused_by_agent',
    'completed'
  ));

-- DB-level trigger: when an outbound, non-AI message is inserted, pause active sequences
CREATE OR REPLACE FUNCTION pause_sequence_on_agent_reply()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.direction = 'outbound' AND NEW.ai_generated = false THEN
    UPDATE lead_sequences
    SET
      status = 'paused_by_agent',
      next_send_at = NULL,
      updated_at = NOW()
    WHERE
      lead_id = NEW.lead_id
      AND status = 'active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pause_sequences_on_agent_outbound
  AFTER INSERT ON messages
  FOR EACH ROW
  WHEN (NEW.direction = 'outbound' AND NEW.ai_generated = false)
  EXECUTE FUNCTION pause_sequence_on_agent_reply();
