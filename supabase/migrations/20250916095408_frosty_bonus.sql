/*
  # Create consultations table for Riley AI integration

  1. New Tables
    - `consultations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `consultation_type` (text: video, ai_photo, instant_quote)
      - `customer_name` (text)
      - `customer_email` (text)
      - `customer_phone` (text)
      - `move_details` (jsonb)
      - `analysis_results` (jsonb)
      - `estimated_cost` (numeric)
      - `status` (text: pending_family_partner_approval, approved, rejected, converted_to_move)
      - `family_partner_notes` (text)
      - `scheduled_date` (timestamptz)
      - `meeting_url` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `consultations` table
    - Add policies for users to read their own consultations
    - Add policies for family partners to manage consultations
*/

CREATE TABLE IF NOT EXISTS consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  consultation_type text NOT NULL CHECK (consultation_type IN ('video', 'ai_photo', 'instant_quote')),
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text DEFAULT '',
  move_details jsonb DEFAULT '{}',
  analysis_results jsonb DEFAULT '{}',
  estimated_cost numeric(10,2) NOT NULL DEFAULT 0,
  status text DEFAULT 'pending_family_partner_approval' CHECK (status IN ('pending_family_partner_approval', 'approved', 'rejected', 'converted_to_move')),
  family_partner_notes text,
  scheduled_date timestamptz,
  meeting_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

-- Users can read their own consultations
CREATE POLICY "Users can read own consultations"
  ON consultations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create their own consultations
CREATE POLICY "Users can create own consultations"
  ON consultations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Family partners can manage all consultations (for admin users)
CREATE POLICY "Family partners can manage consultations"
  ON consultations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.email LIKE '%@inoutmoving.com'
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_consultations_user_id ON consultations(user_id);
CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status);
CREATE INDEX IF NOT EXISTS idx_consultations_type ON consultations(consultation_type);
CREATE INDEX IF NOT EXISTS idx_consultations_created_at ON consultations(created_at);