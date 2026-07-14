/*
  # Add CRM Columns to Contact Submissions Table

  1. New Columns
    - `customer_id` (uuid) - Foreign key linking submission to customer record
    - `consent` (boolean) - Whether user consented to communications
    - `consent_timestamp` (timestamptz) - When consent was given

  2. Constraint Updates
    - Update `status` CHECK to include 'new' value
    - Update `source` CHECK to include 'website' value

  3. Security
    - Index added on customer_id for query performance
*/

DO $$
BEGIN
  -- Add customer_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contact_submissions' AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE contact_submissions ADD COLUMN customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;


    CREATE INDEX IF NOT EXISTS idx_contact_submissions_customer_id ON contact_submissions(customer_id);


  END IF;



  -- Add consent column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contact_submissions' AND column_name = 'consent'
  ) THEN
    ALTER TABLE contact_submissions ADD COLUMN consent boolean DEFAULT false;


  END IF;



  -- Add consent_timestamp column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contact_submissions' AND column_name = 'consent_timestamp'
  ) THEN
    ALTER TABLE contact_submissions ADD COLUMN consent_timestamp timestamptz;


  END IF;


END $$;



-- Update status CHECK constraint to include 'new'
ALTER TABLE contact_submissions DROP CONSTRAINT IF EXISTS contact_submissions_status_check;


ALTER TABLE contact_submissions ADD CONSTRAINT contact_submissions_status_check 
  CHECK (status IN ('new', 'pending', 'read', 'responded', 'archived'));



-- Update source CHECK constraint to include 'website'
ALTER TABLE contact_submissions DROP CONSTRAINT IF EXISTS contact_submissions_source_check;


ALTER TABLE contact_submissions ADD CONSTRAINT contact_submissions_source_check 
  CHECK (source IN ('website', 'landing_page', 'app', 'other'));
