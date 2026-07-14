/*
  # Add CRM Columns to Interactions Table

  1. New Columns
    - `channel` (text) - Communication channel (web_form, phone, email, sms, in_person)
    - `direction` (text) - Inbound or outbound communication
    - `content` (text) - Actual message/interaction content
    - `handled_by` (text) - Who handled the interaction (human, ai, system)

  2. Changes
    - Make `created_by` nullable for system-generated interactions
    - Update constraints to support automated interaction logging

  3. Notes
    - Existing `interaction_type` column preserved for backwards compatibility
    - New columns enable richer CRM tracking
*/

DO $$
BEGIN
  -- Add channel column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'interactions' AND column_name = 'channel'
  ) THEN
    ALTER TABLE interactions ADD COLUMN channel text;


  END IF;



  -- Add direction column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'interactions' AND column_name = 'direction'
  ) THEN
    ALTER TABLE interactions ADD COLUMN direction text;


  END IF;



  -- Add content column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'interactions' AND column_name = 'content'
  ) THEN
    ALTER TABLE interactions ADD COLUMN content text;


  END IF;



  -- Add handled_by column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'interactions' AND column_name = 'handled_by'
  ) THEN
    ALTER TABLE interactions ADD COLUMN handled_by text;


  END IF;


END $$;



-- Make created_by nullable for system-generated interactions
ALTER TABLE interactions ALTER COLUMN created_by DROP NOT NULL;



-- Make interaction_type nullable for new-style interactions that use channel instead
ALTER TABLE interactions ALTER COLUMN interaction_type DROP NOT NULL;



-- Drop the old CHECK constraint on interaction_type if it exists
ALTER TABLE interactions DROP CONSTRAINT IF EXISTS interactions_interaction_type_check;



-- Add flexible CHECK constraint that allows null or valid values
ALTER TABLE interactions ADD CONSTRAINT interactions_interaction_type_check 
  CHECK (interaction_type IS NULL OR interaction_type IN ('call', 'email', 'meeting', 'note', 'sms', 'follow_up', 'web_form'));



-- Add CHECK constraint for channel
ALTER TABLE interactions DROP CONSTRAINT IF EXISTS interactions_channel_check;


ALTER TABLE interactions ADD CONSTRAINT interactions_channel_check 
  CHECK (channel IS NULL OR channel IN ('web_form', 'phone', 'email', 'sms', 'in_person', 'chat'));



-- Add CHECK constraint for direction
ALTER TABLE interactions DROP CONSTRAINT IF EXISTS interactions_direction_check;


ALTER TABLE interactions ADD CONSTRAINT interactions_direction_check 
  CHECK (direction IS NULL OR direction IN ('inbound', 'outbound'));



-- Add CHECK constraint for handled_by
ALTER TABLE interactions DROP CONSTRAINT IF EXISTS interactions_handled_by_check;


ALTER TABLE interactions ADD CONSTRAINT interactions_handled_by_check 
  CHECK (handled_by IS NULL OR handled_by IN ('human', 'ai', 'system'));
