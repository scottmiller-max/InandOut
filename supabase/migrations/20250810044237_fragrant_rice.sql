/*
  # Create Messages Table

  1. New Tables
    - `messages`
      - `id` (uuid, primary key)
      - `move_id` (uuid, foreign key to moves)
      - `sender_type` (text, 'customer' or 'team')
      - `sender_name` (text, required)
      - `sender_avatar` (text, optional)
      - `message_content` (text, required)
      - `message_type` (text, default 'text')
      - `is_read` (boolean, default false)
      - `created_at` (timestamp, default now)

  2. Security
    - Enable RLS on `messages` table
    - Add policies for users to access messages for their moves
*/

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  move_id uuid REFERENCES moves(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('customer', 'team', 'system')),
  sender_name text NOT NULL,
  sender_avatar text,
  message_content text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'location', 'system')),
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read messages for their moves"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM moves 
      WHERE moves.id = messages.move_id 
      AND moves.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages for their moves"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM moves 
      WHERE moves.id = messages.move_id 
      AND moves.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_move_id ON messages(move_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);