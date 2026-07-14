/*
  # Update Customers Table for Contact Flow Integration

  ## Summary
  Updates the customers table to support the new contact submission flow which 
  creates/updates customer records automatically from contact form submissions.

  ## Changes Made

  ### 1. New Columns Added
  - `full_name` (text, NOT NULL, DEFAULT '') - Replaces first_name/last_name with single field
  - `email_consent` (boolean, NOT NULL, DEFAULT true) - Tracks email marketing consent
  - `sms_consent` (boolean, NOT NULL, DEFAULT false) - Tracks SMS marketing consent
  - `last_interaction_at` (timestamptz, NULL) - Timestamp of most recent interaction

  ### 2. Data Migration
  - Existing first_name and last_name values are concatenated into full_name
  - first_name and last_name columns are dropped after migration

  ### 3. Index Updates
  - Added index on last_interaction_at for sorting/filtering

  ## Security
  - No RLS policy changes required (existing policies remain in effect)

  ## Notes
  - The full_name field simplifies contact form handling where users typically 
    enter their complete name in a single field
  - Consent fields support GDPR/TCPA compliance requirements
*/

-- Add new columns to customers table
DO $$
BEGIN
  -- Add full_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'customers' 
    AND column_name = 'full_name'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN full_name text NOT NULL DEFAULT '';


  END IF;



  -- Add email_consent column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'customers' 
    AND column_name = 'email_consent'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN email_consent boolean NOT NULL DEFAULT true;


  END IF;



  -- Add sms_consent column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'customers' 
    AND column_name = 'sms_consent'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN sms_consent boolean NOT NULL DEFAULT false;


  END IF;



  -- Add last_interaction_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'customers' 
    AND column_name = 'last_interaction_at'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN last_interaction_at timestamptz;


  END IF;


END $$;



-- Migrate existing data from first_name + last_name to full_name
UPDATE public.customers 
SET full_name = TRIM(CONCAT(
  COALESCE(first_name, ''), 
  CASE WHEN first_name IS NOT NULL AND first_name != '' AND last_name IS NOT NULL AND last_name != '' 
       THEN ' ' ELSE '' END,
  COALESCE(last_name, '')
))
WHERE full_name = '' OR full_name IS NULL;



-- Drop first_name and last_name columns after migration
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'customers' 
    AND column_name = 'first_name'
  ) THEN
    ALTER TABLE public.customers DROP COLUMN first_name;


  END IF;



  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'customers' 
    AND column_name = 'last_name'
  ) THEN
    ALTER TABLE public.customers DROP COLUMN last_name;


  END IF;


END $$;



-- Add index on last_interaction_at for performance
CREATE INDEX IF NOT EXISTS idx_customers_last_interaction_at 
ON public.customers(last_interaction_at DESC NULLS LAST);
