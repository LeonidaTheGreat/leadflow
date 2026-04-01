-- Migration 020: Ensure findings in product_reviews is always a valid JSONB array
-- Fixes issue where findings could be stored as a string, causing "filter is not a function" errors

CREATE OR REPLACE FUNCTION ensure_findings_is_array()
RETURNS TRIGGER AS $$
DECLARE
  parsed_value JSONB;
BEGIN
  IF NEW.findings IS NULL THEN
    NEW.findings := '[]'::jsonb;
  ELSIF jsonb_typeof(NEW.findings) = 'array' THEN
    NULL;
  ELSIF jsonb_typeof(NEW.findings) = 'string' THEN
    BEGIN
      parsed_value := (NEW.findings ->> 0)::jsonb;
      IF jsonb_typeof(parsed_value) = 'array' THEN
        NEW.findings := parsed_value;
      ELSE
        NEW.findings := jsonb_build_array(parsed_value);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NEW.findings := '[]'::jsonb;
    END;
  ELSE
    NEW.findings := jsonb_build_array(NEW.findings);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_findings_is_array_trigger ON product_reviews;

CREATE TRIGGER ensure_findings_is_array_trigger
BEFORE INSERT OR UPDATE ON product_reviews
FOR EACH ROW
EXECUTE FUNCTION ensure_findings_is_array();
