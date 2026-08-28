/*
  # Create Move Quotes Table

  1. New Tables
    - `move_quotes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `from_address` (text, required)
      - `to_address` (text, required)
      - `move_date` (date, required)
      - `home_size` (text, required)
      - `special_items` (jsonb, array of special items)
      - `estimated_cost` (decimal)
      - `quote_type` (text, required)
      - `status` (text, default 'pending')
      - `notes` (text)
      - `created_at` (timestamp, default now)

  2. Security
    - Enable RLS on `move_quotes` table
    - Add policies for users to manage their own quotes
*/

CREATE TABLE IF NOT EXISTS move_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  from_address text NOT NULL,
  to_address text NOT NULL,
  move_date date NOT NULL,
  home_size text NOT NULL,
  special_items jsonb DEFAULT '[]'::jsonb,
  estimated_cost decimal(10,2),
  quote_type text NOT NULL CHECK (quote_type IN ('ai', 'video', 'in_person')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE move_quotes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own quotes"
  ON move_quotes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own quotes"
  ON move_quotes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quotes"
  ON move_quotes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_move_quotes_user_id ON move_quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_move_quotes_status ON move_quotes(status);
CREATE INDEX IF NOT EXISTS idx_move_quotes_move_date ON move_quotes(move_date);