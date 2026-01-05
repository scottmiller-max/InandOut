/*
  # Update Registered Users Table

  1. Table Updates
    - Add `email` column (text, unique, required)
    - Add `password` column (text, required)
    - Add `first_name` column (text, required)
    - Add `last_name` column (text, required)
    - Add `phone` column (text, required)
    - Add `updated_at` column (timestamp)

  2. Security
    - Enable RLS on updated table
    - Add policies for authenticated users to manage their own data
*/

-- Add new columns to existing Registered Users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Registered Users' AND column_name = 'email'
  ) THEN
    ALTER TABLE "Registered Users" ADD COLUMN email text UNIQUE NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Registered Users' AND column_name = 'password'
  ) THEN
    ALTER TABLE "Registered Users" ADD COLUMN password text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Registered Users' AND column_name = 'first_name'
  ) THEN
    ALTER TABLE "Registered Users" ADD COLUMN first_name text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Registered Users' AND column_name = 'last_name'
  ) THEN
    ALTER TABLE "Registered Users" ADD COLUMN last_name text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Registered Users' AND column_name = 'phone'
  ) THEN
    ALTER TABLE "Registered Users" ADD COLUMN phone text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Registered Users' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE "Registered Users" ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Enable RLS
ALTER TABLE "Registered Users" ENABLE ROW LEVEL SECURITY;

-- Create policies for user data access
CREATE POLICY "Users can read own data"
  ON "Registered Users"
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own data"
  ON "Registered Users"
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text);

CREATE POLICY "Users can insert own data"
  ON "Registered Users"
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = id::text);