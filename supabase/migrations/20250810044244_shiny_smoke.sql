/*
  # Create Customer Photos Table

  1. New Tables
    - `customer_photos`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `move_id` (uuid, foreign key to moves, optional)
      - `photo_url` (text, required)
      - `photo_type` (text, required)
      - `description` (text, optional)
      - `room_type` (text, optional)
      - `is_before_photo` (boolean, default true)
      - `file_size` (integer)
      - `created_at` (timestamp, default now)

  2. Security
    - Enable RLS on `customer_photos` table
    - Add policies for users to manage their own photos
*/

CREATE TABLE IF NOT EXISTS customer_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  move_id uuid REFERENCES moves(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  photo_type text NOT NULL CHECK (photo_type IN ('room', 'item', 'damage', 'inventory')),
  description text,
  room_type text,
  is_before_photo boolean DEFAULT true,
  file_size integer,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE customer_photos ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own photos"
  ON customer_photos
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own photos"
  ON customer_photos
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own photos"
  ON customer_photos
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own photos"
  ON customer_photos
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_photos_user_id ON customer_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_photos_move_id ON customer_photos(move_id);
CREATE INDEX IF NOT EXISTS idx_customer_photos_photo_type ON customer_photos(photo_type);