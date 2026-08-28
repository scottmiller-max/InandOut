/*
  # Create Moves Table

  1. New Tables
    - `moves`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `move_number` (text, unique identifier)
      - `from_address` (text, required)
      - `to_address` (text, required)
      - `move_date` (date, required)
      - `home_size` (text, required)
      - `special_items` (jsonb, array of special items)
      - `status` (text, default 'scheduled')
      - `estimated_cost` (decimal)
      - `actual_cost` (decimal)
      - `team_id` (text)
      - `driver_name` (text)
      - `truck_number` (text)
      - `progress_percentage` (integer, default 0)
      - `notes` (text)
      - `created_at` (timestamp, default now)
      - `updated_at` (timestamp, default now)

  2. Security
    - Enable RLS on `moves` table
    - Add policies for users to manage their own moves
*/

CREATE TABLE IF NOT EXISTS moves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  move_number text UNIQUE NOT NULL,
  from_address text NOT NULL,
  to_address text NOT NULL,
  move_date date NOT NULL,
  home_size text NOT NULL,
  special_items jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  estimated_cost decimal(10,2),
  actual_cost decimal(10,2),
  team_id text,
  driver_name text,
  truck_number text,
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE moves ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own moves"
  ON moves
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own moves"
  ON moves
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own moves"
  ON moves
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_moves_user_id ON moves(user_id);
CREATE INDEX IF NOT EXISTS idx_moves_status ON moves(status);
CREATE INDEX IF NOT EXISTS idx_moves_move_date ON moves(move_date);
CREATE INDEX IF NOT EXISTS idx_moves_move_number ON moves(move_number);