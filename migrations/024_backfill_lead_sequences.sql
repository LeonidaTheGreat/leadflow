-- UC-8 Fix: Backfill lead_sequences for all leads with no existing sequence entry.
-- Inserts a no_response sequence (next_send_at = 24h from now) for every lead
-- that does not already have a sequence row and is not DNC/spam/closed.
-- Safe to re-run: the EXISTS guard prevents duplicate insertions.

INSERT INTO lead_sequences (
  lead_id,
  sequence_type,
  trigger_reason,
  next_send_at,
  status,
  step,
  total_messages_sent,
  max_messages,
  metadata
)
SELECT
  l.id,
  'no_response',
  'backfill_uc8_fix',
  NOW() + INTERVAL '24 hours',
  'active',
  1,
  0,
  3,
  '{"triggered_by": "backfill_uc8_fix"}'::jsonb
FROM leads l
WHERE
  l.status NOT IN ('dnc', 'spam', 'closed')
  AND NOT EXISTS (
    SELECT 1 FROM lead_sequences ls WHERE ls.lead_id = l.id
  );
