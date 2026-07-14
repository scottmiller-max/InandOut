/*
  # Create Files and Settings Tables

  1. New Tables
    - `project_settings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `settings_data` (jsonb) - flexible storage for various settings
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `project_files`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `file_name` (text)
      - `file_type` (text) - mime type
      - `file_size` (bigint) - size in bytes
      - `storage_path` (text) - path in Supabase Storage
      - `category` (text) - e.g., 'settings', 'documents', 'images'
      - `metadata` (jsonb) - flexible storage for additional file metadata
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can only access their own settings and files
    - Policies for SELECT, INSERT, UPDATE, DELETE operations
*/

-- Create project_settings table
CREATE TABLE IF NOT EXISTS project_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  settings_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);



-- Create project_files table
CREATE TABLE IF NOT EXISTS project_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  storage_path text NOT NULL,
  category text DEFAULT 'general',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);



-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_project_files_user_id ON project_files(user_id);


CREATE INDEX IF NOT EXISTS idx_project_files_category ON project_files(category);


CREATE INDEX IF NOT EXISTS idx_project_settings_user_id ON project_settings(user_id);



-- Enable RLS
ALTER TABLE project_settings ENABLE ROW LEVEL SECURITY;


ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;



-- Project Settings Policies
CREATE POLICY "Users can view own settings"
  ON project_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);



CREATE POLICY "Users can insert own settings"
  ON project_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);



CREATE POLICY "Users can update own settings"
  ON project_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);



CREATE POLICY "Users can delete own settings"
  ON project_settings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);



-- Project Files Policies
CREATE POLICY "Users can view own files"
  ON project_files FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);



CREATE POLICY "Users can insert own files"
  ON project_files FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);



CREATE POLICY "Users can update own files"
  ON project_files FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);



CREATE POLICY "Users can delete own files"
  ON project_files FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);



-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();


  RETURN NEW;


END;


$$ LANGUAGE plpgsql;



-- Create triggers for updated_at
CREATE TRIGGER update_project_settings_updated_at
  BEFORE UPDATE ON project_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();



CREATE TRIGGER update_project_files_updated_at
  BEFORE UPDATE ON project_files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
