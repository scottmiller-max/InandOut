/*
  CRM System with Customer Reviews
  1. New Tables: customers, jobs, customer_reviews
  2. Security: RLS and policies
*/

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text NOT NULL,
  address text,
  city text,
  state text,
  zip_code text,
  preferred_contact_method text DEFAULT 'email',
  total_jobs integer DEFAULT 0,
  total_spent numeric(10,2) DEFAULT 0.00,
  average_rating numeric(3,2) DEFAULT 0.00,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  job_number text UNIQUE NOT NULL,
  service_type text NOT NULL CHECK (service_type IN ('loading', 'unloading', 'loading_unloading')),
  job_date date NOT NULL,
  time_slot text NOT NULL,
  crew_size integer DEFAULT 2,
  estimated_hours numeric(4,2),
  actual_hours numeric(4,2),
  from_address text,
  to_address text,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  estimated_cost numeric(10,2),
  actual_cost numeric(10,2),
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  service_provider_notes text,
  customer_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create customer_reviews table
CREATE TABLE IF NOT EXISTS customer_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  overall_rating integer NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  communication_rating integer NOT NULL CHECK (communication_rating >= 1 AND communication_rating <= 5),
  professionalism_rating integer NOT NULL CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
  service_rating integer NOT NULL CHECK (service_rating >= 1 AND service_rating <= 5),
  satisfaction_rating integer NOT NULL CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  customer_comments text,
  review_date timestamptz DEFAULT now(),
  is_featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_reviews ENABLE ROW LEVEL SECURITY;

-- Create policies for customers
CREATE POLICY "Service providers can manage customers"
  ON customers
  FOR ALL
  TO authenticated
  USING (true);

-- Create policies for jobs
CREATE POLICY "Service providers can manage jobs"
  ON jobs
  FOR ALL
  TO authenticated
  USING (true);

-- Create policies for customer_reviews
CREATE POLICY "Service providers can manage reviews"
  ON customer_reviews
  FOR ALL
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_job_date ON jobs(job_date);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_reviews_customer_id ON customer_reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_job_id ON customer_reviews(job_id);
CREATE INDEX IF NOT EXISTS idx_reviews_overall_rating ON customer_reviews(overall_rating);

-- Insert Jorge Castro sample data
INSERT INTO customers (
  first_name, 
  last_name, 
  email, 
  phone, 
  address, 
  city, 
  state, 
  zip_code,
  total_jobs,
  total_spent,
  average_rating
) VALUES (
  'Jorge',
  'Castro',
  'jorge.castro@email.com',
  '(808) 555-0123',
  '500 Lunalilo Home Rd 21K',
  'Honolulu',
  'HI',
  '96825',
  1,
  280.50,
  5.00
) ON CONFLICT (email) DO NOTHING;

-- Insert Jorge's job
INSERT INTO jobs (
  customer_id,
  job_number,
  service_type,
  job_date,
  time_slot,
  crew_size,
  actual_hours,
  status,
  actual_cost,
  payment_status,
  customer_notes
) VALUES (
  (SELECT id FROM customers WHERE email = 'jorge.castro@email.com'),
  'JB-0e8cef38',
  'unloading',
  '2025-07-12',
  'Morning',
  2,
  2.0,
  'completed',
  280.50,
  'paid',
  '1 Bedroom Home to 2 Bedroom Apt. - 0 flights of stairs. Unload furniture on Saturday morning from 930am-1130pm'
) ON CONFLICT (job_number) DO NOTHING;

-- Insert Jorge's review
INSERT INTO customer_reviews (
  customer_id,
  job_id,
  overall_rating,
  communication_rating,
  professionalism_rating,
  service_rating,
  satisfaction_rating,
  customer_comments,
  review_date,
  is_featured
) VALUES (
  (SELECT id FROM customers WHERE email = 'jorge.castro@email.com'),
  (SELECT id FROM jobs WHERE job_number = 'JB-0e8cef38'),
  5,
  5,
  5,
  5,
  5,
  'Arrived on time and were fast, friendly and efficient.',
  '2025-07-13',
  true
) ON CONFLICT DO NOTHING;