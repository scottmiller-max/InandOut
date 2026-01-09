/*
  # Create Interactions Table for CRM

  1. New Tables
    - `interactions`
      - `id` (uuid, primary key) - Unique identifier for the interaction
      - `customer_id` (uuid, optional) - Reference to customers table
      - `contact_submission_id` (uuid, optional) - Reference to contact_submissions table for follow-up tracking
      - `interaction_type` (text) - Type of interaction: call, email, meeting, note, sms, follow_up
      - `subject` (text, optional) - Brief subject/title for the interaction
      - `notes` (text) - Detailed notes about the interaction
      - `outcome` (text, optional) - Result or outcome of the interaction
      - `follow_up_date` (timestamptz, optional) - Scheduled follow-up date if applicable
      - `created_by` (uuid) - User who logged the interaction
      - `created_at` (timestamptz) - When the interaction was logged
      - `updated_at` (timestamptz) - Last update timestamp

  2. Relationships
    - Optional foreign key to `customers` table
    - Optional foreign key to `contact_submissions` table
    - Required foreign key to `auth.users` for created_by

  3. Security
    - Enable RLS on `interactions` table
    - Admins can perform all CRUD operations
    - Crew members can create, read, and update interactions
    - All authenticated users can read interactions they created

  4. Indexes
    - Index on customer_id for fast customer lookup
    - Index on contact_submission_id for follow-up tracking
    - Index on created_at for chronological queries
    - Index on created_by for user's interactions
*/

-- Create interactions table
CREATE TABLE IF NOT EXISTS interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  contact_submission_id uuid REFERENCES contact_submissions(id) ON DELETE SET NULL,
  interaction_type text NOT NULL CHECK (interaction_type IN ('call', 'email', 'meeting', 'note', 'sms', 'follow_up')),
  subject text,
  notes text NOT NULL DEFAULT '',
  outcome text,
  follow_up_date timestamptz,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add constraint to ensure at least one of customer_id or contact_submission_id is provided
-- (interaction must be linked to something)
ALTER TABLE interactions
ADD CONSTRAINT interactions_must_have_reference
CHECK (customer_id IS NOT NULL OR contact_submission_id IS NOT NULL);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_interactions_customer_id ON interactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_interactions_contact_submission_id ON interactions(contact_submission_id);
CREATE INDEX IF NOT EXISTS idx_interactions_created_at ON interactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_created_by ON interactions(created_by);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON interactions(interaction_type);

-- Enable Row Level Security
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- SELECT: Admins and crew can read all interactions
CREATE POLICY "Admins can read all interactions"
  ON interactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'master_admin')
    )
  );

CREATE POLICY "Crew can read all interactions"
  ON interactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'crew'
    )
  );

CREATE POLICY "Users can read own interactions"
  ON interactions
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

-- INSERT: Admins and crew can create interactions
CREATE POLICY "Admins can create interactions"
  ON interactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'master_admin')
    )
  );

CREATE POLICY "Crew can create interactions"
  ON interactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'crew'
    )
  );

-- UPDATE: Admins can update any interaction, crew can update their own
CREATE POLICY "Admins can update any interaction"
  ON interactions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'master_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'master_admin')
    )
  );

CREATE POLICY "Crew can update own interactions"
  ON interactions
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'crew'
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'crew'
    )
  );

-- DELETE: Only admins can delete interactions
CREATE POLICY "Admins can delete interactions"
  ON interactions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'master_admin')
    )
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_interactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_interactions_updated_at ON interactions;
CREATE TRIGGER trigger_interactions_updated_at
  BEFORE UPDATE ON interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_interactions_updated_at();