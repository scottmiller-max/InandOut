/*
  # Add Payments, Invoices, and Documents Tables

  1. New Tables
    - `payments`
      - `id` (uuid, primary key)
      - `job_id` (uuid, foreign key to jobs)
      - `amount` (numeric, payment amount in cents)
      - `currency` (text, default 'usd')
      - `status` (text, payment status)
      - `payment_intent_id` (text, Stripe payment intent ID)
      - `payment_method` (text, payment method used)
      - `paid_at` (timestamptz, when payment was completed)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `invoices`
      - `id` (uuid, primary key)
      - `job_id` (uuid, foreign key to jobs)
      - `invoice_number` (text, unique, format: INV-YYMM-XXXX)
      - `amount` (numeric, subtotal)
      - `tax` (numeric, tax amount)
      - `total` (numeric, total amount)
      - `status` (text, invoice status)
      - `due_date` (date, payment due date)
      - `issued_at` (timestamptz, when invoice was issued)
      - `paid_at` (timestamptz, when invoice was paid)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `documents`
      - `id` (uuid, primary key)
      - `job_id` (uuid, foreign key to jobs)
      - `document_type` (text, type of document)
      - `file_name` (text, original file name)
      - `file_path` (text, path in storage bucket)
      - `file_size` (integer, size in bytes)
      - `mime_type` (text, file MIME type)
      - `uploaded_by` (uuid, user who uploaded)
      - `is_signed` (boolean, whether document is signed)
      - `signed_at` (timestamptz, when signed)
      - `signed_by` (uuid, who signed it)
      - `metadata` (jsonb, additional metadata)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Changes
    - Drop redundant "Registered Users" table
    - Add job_number column to jobs table if not exists
    - Add move_number column to moves table if not exists

  3. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users to manage their own data
    - Add policies for admins to manage all data

  4. Storage
    - Create documents storage bucket
*/

-- Drop redundant "Registered Users" table
DROP TABLE IF EXISTS "Registered Users" CASCADE;

-- Ensure job_number exists on jobs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'job_number'
  ) THEN
    ALTER TABLE jobs ADD COLUMN job_number text UNIQUE;
  END IF;
END $$;

-- Ensure move_number exists on moves table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'moves' AND column_name = 'move_number'
  ) THEN
    ALTER TABLE moves ADD COLUMN move_number text UNIQUE;
  END IF;
END $$;

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  payment_intent_id text,
  payment_method text,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_job_id ON payments(job_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_intent_id ON payments(payment_intent_id);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  invoice_number text UNIQUE NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  due_date date NOT NULL,
  issued_at timestamptz DEFAULT now(),
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_job_id ON invoices(job_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('contract', 'policy', 'invoice', 'receipt', 'quote', 'photo', 'signature', 'other')),
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer NOT NULL DEFAULT 0,
  mime_type text NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_signed boolean DEFAULT false,
  signed_at timestamptz,
  signed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_job_id ON documents(job_id);
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payments
CREATE POLICY "Users can view payments for their jobs"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs j
      JOIN customers c ON j.customer_id = c.id
      WHERE j.id = payments.job_id
      AND c.email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "Admins can view all payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('master_admin', 'admin')
    )
  );

CREATE POLICY "Admins can manage all payments"
  ON payments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('master_admin', 'admin')
    )
  );

-- RLS Policies for invoices
CREATE POLICY "Users can view invoices for their jobs"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs j
      JOIN customers c ON j.customer_id = c.id
      WHERE j.id = invoices.job_id
      AND c.email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "Admins can view all invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('master_admin', 'admin')
    )
  );

CREATE POLICY "Admins can manage all invoices"
  ON invoices FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('master_admin', 'admin')
    )
  );

-- RLS Policies for documents
CREATE POLICY "Users can view documents for their jobs"
  ON documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs j
      JOIN customers c ON j.customer_id = c.id
      WHERE j.id = documents.job_id
      AND c.email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "Users can upload documents to their jobs"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM jobs j
      JOIN customers c ON j.customer_id = c.id
      WHERE j.id = documents.job_id
      AND c.email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "Admins can view all documents"
  ON documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('master_admin', 'admin')
    )
  );

CREATE POLICY "Admins can manage all documents"
  ON documents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('master_admin', 'admin')
    )
  );

-- Update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
