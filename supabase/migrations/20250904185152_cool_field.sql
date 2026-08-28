/*
  # Profile Integration Enhancements

  1. New Tables
    - `user_documents`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `document_type` (text, contract/receipt/insurance)
      - `document_name` (text)
      - `document_url` (text)
      - `file_size` (integer)
      - `uploaded_at` (timestamp)
      - `is_signed` (boolean)
    
    - `user_preferences`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `move_preferences` (jsonb)
      - `communication_preferences` (jsonb)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on new tables
    - Add policies for user-only access to documents and preferences
    - Ensure admin access for CRM functionality

  3. Indexes
    - Add performance indexes for user lookups
    - Document type and upload date indexes
*/

-- User Documents Table
CREATE TABLE IF NOT EXISTS user_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('contract', 'receipt', 'insurance', 'inventory', 'other')),
  document_name text NOT NULL,
  document_url text NOT NULL,
  file_size integer,
  uploaded_at timestamptz DEFAULT now(),
  is_signed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own documents"
  ON user_documents
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON user_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage documents"
  ON user_documents
  FOR ALL
  TO service_role
  USING (true);

-- User Preferences Table
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  move_preferences jsonb DEFAULT '{
    "preferredTimeSlot": "morning",
    "packingService": true,
    "storageNeeded": false,
    "specialInstructions": "",
    "contactMethod": "email"
  }'::jsonb,
  communication_preferences jsonb DEFAULT '{
    "smsUpdates": true,
    "emailNotifications": true,
    "pushNotifications": false,
    "milestoneUpdates": true,
    "etaUpdates": true,
    "teamMessages": true
  }'::jsonb,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own preferences"
  ON user_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own preferences"
  ON user_preferences
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON user_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_type ON user_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_user_documents_uploaded_at ON user_documents(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Update users table with additional profile fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'outstanding_balance'
  ) THEN
    ALTER TABLE users ADD COLUMN outstanding_balance numeric(10,2) DEFAULT 0.00;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_active'
  ) THEN
    ALTER TABLE users ADD COLUMN last_active timestamptz DEFAULT now();
  END IF;
END $$;