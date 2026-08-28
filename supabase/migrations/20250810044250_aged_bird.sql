/*
  # Create Events Table

  1. New Tables
    - `events`
      - `id` (uuid, primary key)
      - `move_id` (uuid, foreign key to moves)
      - `event_type` (text, required)
      - `event_title` (text, required)
      - `event_description` (text)
      - `event_time` (timestamp, required)
      - `status` (text, default 'scheduled')
      - `location` (text)
      - `created_at` (timestamp, default now)

  2. Security
    - Enable RLS on `events` table
    - Add policies for users to access events for their moves
*/

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  move_id uuid REFERENCES moves(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('packing', 'loading', 'transport', 'unloading', 'completion', 'delay', 'update')),
  event_title text NOT NULL,
  event_description text,
  event_time timestamptz NOT NULL,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  location text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read events for their moves"
  ON events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM moves 
      WHERE moves.id = events.move_id 
      AND moves.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_move_id ON events(move_id);
CREATE INDEX IF NOT EXISTS idx_events_event_time ON events(event_time);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);