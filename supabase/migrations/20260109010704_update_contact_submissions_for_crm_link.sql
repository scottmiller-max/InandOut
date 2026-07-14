/*
  # Update Contact Submissions for CRM Integration

  ## Summary
  Enhances the contact_submissions table to link submissions to customer records
  and track consent information for compliance.

  ## Changes Made

  ### 1. New Columns Added
  - `customer_id` (uuid, FK to customers.id, nullable) - Links submission to customer record
  - `consent` (boolean, NOT NULL, DEFAULT false) - SMS/marketing consent given
  - `consent_timestamp` (timestamptz, nullable) - When consent was given

  ### 2. Constraint Updates
  - Updated `status` CHECK constraint to include 'new' value
  - Updated `source` CHECK constraint to include 'website' value

  ### 3. Foreign Key Relationships
  - Added foreign key from customer_id to customers(id) with SET NULL on delete

  ### 4. Index Updates
  - Added index on customer_id for join performance

  ## Security
  - Existing RLS policies remain in effect
  - No policy changes needed as customer_id is set by service role
*/

-- Add customer_id column with foreign key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'contact_submissions' 
    AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE public.contact_submissions 
    ADD COLUMN customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;


  END IF;


END $$;



-- Add consent column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'contact_submissions' 
    AND column_name = 'consent'
  ) THEN
    ALTER TABLE public.contact_submissions 
    ADD COLUMN consent boolean NOT NULL DEFAULT false;


  END IF;


END $$;



-- Add consent_timestamp column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'contact_submissions' 
    AND column_name = 'consent_timestamp'
  ) THEN
    ALTER TABLE public.contact_submissions 
    ADD COLUMN consent_timestamp timestamptz;


  END IF;


END $$;



-- Update status CHECK constraint to include 'new'
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'contact_submissions_status_check' 
    AND table_name = 'contact_submissions'
  ) THEN
    ALTER TABLE public.contact_submissions DROP CONSTRAINT contact_submissions_status_check;


  END IF;


  
  -- Add updated constraint with 'new' value
  ALTER TABLE public.contact_submissions 
  ADD CONSTRAINT contact_submissions_status_check 
  CHECK (status IN ('new', 'pending', 'read', 'responded', 'archived'));


END $$;



-- Update source CHECK constraint to include 'website'
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'contact_submissions_source_check' 
    AND table_name = 'contact_submissions'
  ) THEN
    ALTER TABLE public.contact_submissions DROP CONSTRAINT contact_submissions_source_check;


  END IF;


  
  -- Add updated constraint with 'website' value
  ALTER TABLE public.contact_submissions 
  ADD CONSTRAINT contact_submissions_source_check 
  CHECK (source IN ('landing_page', 'app', 'website', 'other'));


END $$;



-- Add index on customer_id for join performance
CREATE INDEX IF NOT EXISTS idx_contact_submissions_customer_id 
ON public.contact_submissions(customer_id);
