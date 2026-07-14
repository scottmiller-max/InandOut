/*
  # Contact Submissions System

  1. New Tables
    - `contact_submissions`
      - `id` (uuid, primary key)
      - `name` (text, required) - Full name of contact
      - `email` (text, required) - Email address
      - `phone` (text, optional) - Phone number
      - `subject` (text, optional) - Message subject
      - `message` (text, required) - Message content
      - `status` (text) - pending, read, responded, archived
      - `source` (text) - landing_page, app, other
      - `user_agent` (text, optional) - Browser/device info
      - `ip_address` (text, optional) - IP address for spam prevention
      - `responded_at` (timestamptz, optional) - When admin responded
      - `responded_by` (uuid, optional) - Admin who responded
      - `notes` (text, optional) - Internal admin notes
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `contact_submissions` table
    - Only admins can read/update contact submissions
    - Public insert for new submissions (rate limited by application)

  3. Indexes
    - Index on email for searching
    - Index on status for filtering
    - Index on created_at for sorting
*/

-- Create contact_submissions table
CREATE TABLE IF NOT EXISTS contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  subject text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  source text NOT NULL DEFAULT 'landing_page',
  user_agent text,
  ip_address text,
  responded_at timestamptz,
  responded_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);



-- Add check constraint for status
ALTER TABLE contact_submissions 
  DROP CONSTRAINT IF EXISTS contact_submissions_status_check;


  
ALTER TABLE contact_submissions 
  ADD CONSTRAINT contact_submissions_status_check 
  CHECK (status IN ('pending', 'read', 'responded', 'archived'));



-- Add check constraint for source
ALTER TABLE contact_submissions 
  DROP CONSTRAINT IF EXISTS contact_submissions_source_check;


  
ALTER TABLE contact_submissions 
  ADD CONSTRAINT contact_submissions_source_check 
  CHECK (source IN ('landing_page', 'app', 'other'));



-- Create indexes
CREATE INDEX IF NOT EXISTS idx_contact_submissions_email 
  ON contact_submissions(email);



CREATE INDEX IF NOT EXISTS idx_contact_submissions_status 
  ON contact_submissions(status);



CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at 
  ON contact_submissions(created_at DESC);



-- Enable Row Level Security
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;



-- Allow public to insert new submissions (honeypot/rate limiting handled in edge function)
CREATE POLICY "Anyone can submit contact form"
  ON contact_submissions
  FOR INSERT
  TO anon
  WITH CHECK (true);



-- Allow authenticated users to insert submissions
CREATE POLICY "Authenticated users can submit contact form"
  ON contact_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);



-- Only admins can read contact submissions
CREATE POLICY "Admins can view all contact submissions"
  ON contact_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'master_admin')
    )
  );



-- Only admins can update contact submissions
CREATE POLICY "Admins can update contact submissions"
  ON contact_submissions
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



-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_contact_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();


  RETURN NEW;


END;


$$ LANGUAGE plpgsql;



DROP TRIGGER IF EXISTS update_contact_submissions_updated_at_trigger 
  ON contact_submissions;



CREATE TRIGGER update_contact_submissions_updated_at_trigger
  BEFORE UPDATE ON contact_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_submissions_updated_at();



-- Add comment for documentation
COMMENT ON TABLE contact_submissions IS 'Stores contact form submissions from landing page and app';
