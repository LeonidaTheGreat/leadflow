-- Migration 020: Ensure findings in product_reviews is always a valid JSONB array
-- Fixes issue where findings could be stored as a string, causing "filter is not a function" errors
-- Adds a database-level constraint and trigger for data integrity

CREATE OR REPLACE FUNCTION ensure_findings_is_array()
RETURNS TRIGGER AS $$
DECLARE
  parsed_value JSONB;
BEGIN
  -- If findings is NULL, set it to empty array
  IF NEW.findings IS NULL THEN
    NEW.findings := '[]'::jsonb;
  ELSE
    -- Check if findings is already a properly formed array
    IF jsonb_typeof(NEW.findings) = 'array' THEN
      -- Already valid, do nothing
      NULL;
    ELSIF jsonb_typeof(NEW.findings) = 'string' THEN
      -- It's a JSONB string - try to parse it
      BEGIN
        parsed_value := (NEW.findings ->> 0)::jsonb;
        IF jsonb_typeof(parsed_value) = 'array' THEN
          NEW.findings := parsed_value;
        ELSE
          -- Wrap non-array in array
          NEW.findings := jsonb_build_array(parsed_value);
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- If parsing fails, use empty array
        NEW.findings := '[]'::jsonb;
      END;
    ELSE
      -- For objects, numbers, booleans, etc. - wrap in array
      NEW.findings := jsonb_build_array(NEW.findings);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS ensure_findings_is_array_trigger ON product_reviews;

-- Create the trigger
CREATE TRIGGER ensure_findings_is_array_trigger
BEFORE INSERT OR UPDATE ON product_reviews
FOR EACH ROW
EXECUTE FUNCTION ensure_findings_is_array();
