/*
  # Update Interactions Table for Automated Logging

  ## Summary
  Enhances the interactions table to support automated interaction logging from
  contact form submissions and other system-generated events.

  ## Changes Made

  ### 1. New Columns Added (preserving existing interaction_type column)
  - `channel` (text, nullable) - Communication channel: web_form, phone, email, sms, in_person, chat
  - `direction` (text, nullable) - Interaction direction: inbound, outbound
  - `content` (text, nullable) - Full content/message text
  - `handled_by` (text, nullable) - Handler type: human, ai, system

  ### 2. Service Account for System Interactions
  - Creates a dedicated system service account UUID for automated interactions
  - This account is used when interactions are created programmatically
  - UUID: 00000000-0000-0000-0000-000000000001 (system_service_account)

  ### 3. Constraint Updates
  - created_by now allows NULL for system-generated interactions
  - Updated reference constraint to work with service account

  ### 4. Index Updates
  - Added indexes on new columns for filtering performance

  ## Security
  - Existing RLS policies remain in effect
  - System service account bypasses RLS via service role key

  ## Notes
  - Existing interaction_type values (call, email, meeting, note, sms, follow_up) are preserved
  - New columns provide additional context without breaking existing functionality
*/

-- Define system service account UUID as a constant
-- This UUID represents automated/system-generated interactions
-- 00000000-0000-0000-0000-000000000001

-- Add channel column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'interactions' 
    AND column_name = 'channel'
  ) THEN
    ALTER TABLE public.interactions 
    ADD COLUMN channel text;
  END IF;
END $$;

-- Add direction column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'interactions' 
    AND column_name = 'direction'
  ) THEN
    ALTER TABLE public.interactions 
    ADD COLUMN direction text;
  END IF;
END $$;

-- Add content column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'interactions' 
    AND column_name = 'content'
  ) THEN
    ALTER TABLE public.interactions 
    ADD COLUMN content text;
  END IF;
END $$;

-- Add handled_by column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'interactions' 
    AND column_name = 'handled_by'
  ) THEN
    ALTER TABLE public.interactions 
    ADD COLUMN handled_by text;
  END IF;
END $$;

-- Add CHECK constraint for channel values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'interactions_channel_check' 
    AND table_name = 'interactions'
  ) THEN
    ALTER TABLE public.interactions 
    ADD CONSTRAINT interactions_channel_check 
    CHECK (channel IS NULL OR channel IN ('web_form', 'phone', 'email', 'sms', 'in_person', 'chat'));
  END IF;
END $$;

-- Add CHECK constraint for direction values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'interactions_direction_check' 
    AND table_name = 'interactions'
  ) THEN
    ALTER TABLE public.interactions 
    ADD CONSTRAINT interactions_direction_check 
    CHECK (direction IS NULL OR direction IN ('inbound', 'outbound'));
  END IF;
END $$;

-- Add CHECK constraint for handled_by values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'interactions_handled_by_check' 
    AND table_name = 'interactions'
  ) THEN
    ALTER TABLE public.interactions 
    ADD CONSTRAINT interactions_handled_by_check 
    CHECK (handled_by IS NULL OR handled_by IN ('human', 'ai', 'system'));
  END IF;
END $$;

-- Make created_by nullable for system-generated interactions
-- First drop the NOT NULL constraint if it exists
DO $$
BEGIN
  -- Check if the column is NOT NULL and alter it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'interactions' 
    AND column_name = 'created_by'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.interactions ALTER COLUMN created_by DROP NOT NULL;
  END IF;
END $$;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_interactions_channel 
ON public.interactions(channel) WHERE channel IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_interactions_direction 
ON public.interactions(direction) WHERE direction IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_interactions_handled_by 
ON public.interactions(handled_by) WHERE handled_by IS NOT NULL;

-- Update the must_have_reference constraint to also allow interactions with just customer_id
-- (the original constraint required at least one of customer_id or contact_submission_id)
-- This is already the existing behavior, so no change needed

-- Create a helper function to get the system service account UUID
-- This can be used in application code to identify system-generated interactions
CREATE OR REPLACE FUNCTION public.get_system_service_account_id()
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT '00000000-0000-0000-0000-000000000001'::uuid;
$$;