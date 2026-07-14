/*
  # Add CRM Columns to Customers Table

  1. Changes
    - Add `full_name` column for single-field name storage (used by contact forms)
    - Add `email_consent` column for email marketing consent tracking
    - Add `sms_consent` column for SMS marketing consent tracking
    - Add `last_interaction_at` column for CRM activity tracking

  2. Notes
    - Existing `first_name` and `last_name` columns are preserved for backwards compatibility
    - All new columns have sensible defaults
    - No data migration needed - existing records will use defaults
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'full_name'
  ) THEN
    ALTER TABLE customers ADD COLUMN full_name text DEFAULT '';


  END IF;



  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'email_consent'
  ) THEN
    ALTER TABLE customers ADD COLUMN email_consent boolean DEFAULT true;


  END IF;



  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'sms_consent'
  ) THEN
    ALTER TABLE customers ADD COLUMN sms_consent boolean DEFAULT false;


  END IF;



  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'last_interaction_at'
  ) THEN
    ALTER TABLE customers ADD COLUMN last_interaction_at timestamptz;


  END IF;


END $$;
