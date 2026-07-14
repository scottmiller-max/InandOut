/*
  # IN&OUT Moving App - Core Database Schema

  1. New Tables
    - `customers`: Customer information linked to auth.users
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `email` (text, unique)
      - `first_name`, `last_name` (text)
      - `phone` (text)
      - `address`, `city`, `state`, `zip_code` (text)
      - `notes` (text)
      - `source` (text, how they found us)
      - Timestamps

    - `user_roles`: Role-based access control
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `role` (text: customer, crew, admin, master_admin)
      - `assigned_by` (uuid)
      - Timestamps

    - `jobs`: Moving jobs/quotes
      - `id` (uuid, primary key)
      - `customer_id` (uuid, references customers)
      - `job_number` (text, unique, format: JOB-YYMMDD-XXX)
      - `status` (text: lead, quoted, scheduled, in_progress, completed, cancelled)
      - Move details (addresses, dates, size, items)
      - Pricing (estimated_hours, hourly_rate, total, deposit)
      - Team assignment
      - Timestamps

    - `moves`: Legacy moves table (customer-facing)
      - Similar to jobs but simplified view
      - References jobs table

    - `messages`: In-app messaging
      - `id` (uuid, primary key)
      - `job_id` (uuid, references jobs)
      - `sender_type` (customer, team, system)
      - `message_content`, `message_type`
      - Timestamps

    - `events`: Job timeline events
      - `id` (uuid, primary key)
      - `job_id` (uuid, references jobs)
      - `event_type`, `event_title`, `event_description`
      - `event_time`, `status`, `location`
      - Timestamps

    - `customer_photos`: Photo uploads
      - `id` (uuid, primary key)
      - `customer_id` (uuid, references customers)
      - `job_id` (uuid, references jobs)
      - `photo_url`, `photo_type`, `description`
      - Timestamps

    - `document_templates`: Legal document templates
      - `id` (uuid, primary key)
      - `template_name`, `template_type`
      - `file_path`, `version`, `is_active`
      - Timestamps

  2. Security
    - RLS enabled on all tables
    - Policies for customer data access
    - Policies for admin access
    - Master admin auto-assignment trigger

  3. Indexes
    - Performance indexes on frequently queried columns
*/

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text UNIQUE NOT NULL,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  address text DEFAULT '',
  city text DEFAULT '',
  state text DEFAULT '',
  zip_code text DEFAULT '',
  notes text DEFAULT '',
  source text DEFAULT 'website',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);



CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);


CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);



ALTER TABLE customers ENABLE ROW LEVEL SECURITY;



-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'crew', 'admin', 'master_admin')),
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);



CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);


CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);



ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;



-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  job_number text UNIQUE,
  status text NOT NULL DEFAULT 'lead' CHECK (status IN ('lead', 'quoted', 'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  from_address text NOT NULL DEFAULT '',
  from_city text DEFAULT '',
  from_state text DEFAULT '',
  from_zip text DEFAULT '',
  to_address text NOT NULL DEFAULT '',
  to_city text DEFAULT '',
  to_state text DEFAULT '',
  to_zip text DEFAULT '',
  move_date date,
  move_time time,
  home_size text DEFAULT '',
  num_bedrooms integer DEFAULT 0,
  num_movers integer DEFAULT 2,
  special_items text[] DEFAULT '{}',
  stairs_origin integer DEFAULT 0,
  stairs_destination integer DEFAULT 0,
  estimated_hours numeric(4,2) DEFAULT 0,
  hourly_rate numeric(10,2) DEFAULT 150.00,
  estimated_total numeric(10,2) DEFAULT 0,
  actual_hours numeric(4,2),
  actual_total numeric(10,2),
  deposit_amount numeric(10,2) DEFAULT 0,
  deposit_paid boolean DEFAULT false,
  deposit_paid_at timestamptz,
  team_lead_id uuid,
  crew_ids uuid[] DEFAULT '{}',
  truck_number text,
  notes text DEFAULT '',
  internal_notes text DEFAULT '',
  progress_percentage integer DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);



CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON jobs(customer_id);


CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);


CREATE INDEX IF NOT EXISTS idx_jobs_move_date ON jobs(move_date);


CREATE INDEX IF NOT EXISTS idx_jobs_job_number ON jobs(job_number);



ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;



-- Create moves table (customer-facing view of jobs)
CREATE TABLE IF NOT EXISTS moves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  move_number text UNIQUE,
  from_address text NOT NULL DEFAULT '',
  to_address text NOT NULL DEFAULT '',
  move_date date,
  home_size text DEFAULT '',
  special_items text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  estimated_cost numeric(10,2),
  actual_cost numeric(10,2),
  team_id uuid,
  driver_name text,
  truck_number text,
  progress_percentage integer DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);



CREATE INDEX IF NOT EXISTS idx_moves_user_id ON moves(user_id);


CREATE INDEX IF NOT EXISTS idx_moves_job_id ON moves(job_id);


CREATE INDEX IF NOT EXISTS idx_moves_status ON moves(status);



ALTER TABLE moves ENABLE ROW LEVEL SECURITY;



-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  move_id uuid REFERENCES moves(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_type text NOT NULL DEFAULT 'customer' CHECK (sender_type IN ('customer', 'team', 'system')),
  sender_name text NOT NULL DEFAULT '',
  sender_avatar text,
  message_content text NOT NULL DEFAULT '',
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'location', 'system')),
  is_read boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);



CREATE INDEX IF NOT EXISTS idx_messages_job_id ON messages(job_id);


CREATE INDEX IF NOT EXISTS idx_messages_move_id ON messages(move_id);


CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);



ALTER TABLE messages ENABLE ROW LEVEL SECURITY;



-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  move_id uuid REFERENCES moves(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('packing', 'loading', 'transport', 'unloading', 'completion', 'delay', 'update', 'note')),
  event_title text NOT NULL DEFAULT '',
  event_description text,
  event_time timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  location text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);



CREATE INDEX IF NOT EXISTS idx_events_job_id ON events(job_id);


CREATE INDEX IF NOT EXISTS idx_events_move_id ON events(move_id);


CREATE INDEX IF NOT EXISTS idx_events_event_time ON events(event_time);



ALTER TABLE events ENABLE ROW LEVEL SECURITY;



-- Create customer_photos table
CREATE TABLE IF NOT EXISTS customer_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid REFERENCES jobs(id) ON DELETE SET NULL,
  move_id uuid REFERENCES moves(id) ON DELETE SET NULL,
  photo_url text NOT NULL,
  photo_type text NOT NULL DEFAULT 'room' CHECK (photo_type IN ('room', 'item', 'damage', 'inventory', 'before', 'after')),
  description text,
  room_type text,
  is_before_photo boolean DEFAULT true,
  file_size integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);



CREATE INDEX IF NOT EXISTS idx_customer_photos_customer_id ON customer_photos(customer_id);


CREATE INDEX IF NOT EXISTS idx_customer_photos_user_id ON customer_photos(user_id);


CREATE INDEX IF NOT EXISTS idx_customer_photos_job_id ON customer_photos(job_id);



ALTER TABLE customer_photos ENABLE ROW LEVEL SECURITY;



-- Create document_templates table
CREATE TABLE IF NOT EXISTS document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL,
  template_type text NOT NULL CHECK (template_type IN (
    'liability_waiver', 
    'refusal_policy', 
    'service_agreement', 
    'completion_acknowledgment', 
    'no_equipment_agreement',
    'invoice_template',
    'quote_template'
  )),
  file_path text NOT NULL,
  version integer DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);



CREATE INDEX IF NOT EXISTS idx_document_templates_type ON document_templates(template_type);


CREATE INDEX IF NOT EXISTS idx_document_templates_active ON document_templates(is_active);



ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;



-- RLS Policies for customers
CREATE POLICY "Users can view their own customer record"
  ON customers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());



CREATE POLICY "Admins can view all customers"
  ON customers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('master_admin', 'admin')
    )
  );



CREATE POLICY "Admins can manage all customers"
  ON customers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('master_admin', 'admin')
    )
  );



-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());



CREATE POLICY "Admins can view all roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('master_admin', 'admin')
    )
  );



CREATE POLICY "Master admins can manage roles"
  ON user_roles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'master_admin'
    )
  );



-- RLS Policies for jobs
CREATE POLICY "Customers can view their jobs"
  ON jobs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = jobs.customer_id
      AND c.user_id = auth.uid()
    )
  );



CREATE POLICY "Admins can view all jobs"
  ON jobs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('master_admin', 'admin', 'crew')
    )
  );



CREATE POLICY "Admins can manage all jobs"
  ON jobs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('master_admin', 'admin')
    )
  );



-- RLS Policies for moves
CREATE POLICY "Users can view their own moves"
  ON moves FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());



CREATE POLICY "Admins can view all moves"
  ON moves FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('master_admin', 'admin', 'crew')
    )
  );



CREATE POLICY "Admins can manage all moves"
  ON moves FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('master_admin', 'admin')
    )
  );



-- RLS Policies for messages
CREATE POLICY "Users can view messages for their jobs"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM moves m
      WHERE m.id = messages.move_id
      AND m.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM jobs j
      JOIN customers c ON c.id = j.customer_id
      WHERE j.id = messages.job_id
      AND c.user_id = auth.uid()
    )
  );



CREATE POLICY "Users can send messages to their jobs"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM moves m
        WHERE m.id = messages.move_id
        AND m.user_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM jobs j
        JOIN customers c ON c.id = j.customer_id
        WHERE j.id = messages.job_id
        AND c.user_id = auth.uid()
      )
    )
  );



CREATE POLICY "Admins can manage all messages"
  ON messages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('master_admin', 'admin', 'crew')
    )
  );



-- RLS Policies for events
CREATE POLICY "Users can view events for their jobs"
  ON events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM moves m
      WHERE m.id = events.move_id
      AND m.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM jobs j
      JOIN customers c ON c.id = j.customer_id
      WHERE j.id = events.job_id
      AND c.user_id = auth.uid()
    )
  );



CREATE POLICY "Admins can manage all events"
  ON events FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('master_admin', 'admin', 'crew')
    )
  );



-- RLS Policies for customer_photos
CREATE POLICY "Users can view their own photos"
  ON customer_photos FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());



CREATE POLICY "Users can upload their own photos"
  ON customer_photos FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());



CREATE POLICY "Admins can manage all photos"
  ON customer_photos FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('master_admin', 'admin')
    )
  );



-- RLS Policies for document_templates (read-only for all authenticated)
CREATE POLICY "All authenticated users can view active templates"
  ON document_templates FOR SELECT
  TO authenticated
  USING (is_active = true);



CREATE POLICY "Admins can manage templates"
  ON document_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('master_admin', 'admin')
    )
  );



-- Function to auto-assign master_admin role
CREATE OR REPLACE FUNCTION assign_master_admin_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email = 'inandoutmovin@gmail.com' THEN
    INSERT INTO user_roles (user_id, role, assigned_by)
    VALUES (NEW.id, 'master_admin', NEW.id)
    ON CONFLICT (user_id, role) DO NOTHING;


  ELSE
    INSERT INTO user_roles (user_id, role)
    VALUES (NEW.id, 'customer')
    ON CONFLICT (user_id, role) DO NOTHING;


  END IF;


  RETURN NEW;


END;


$$ LANGUAGE plpgsql SECURITY DEFINER;



-- Trigger to auto-assign roles on user creation
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;


CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION assign_master_admin_role();



-- Function to generate job numbers
CREATE OR REPLACE FUNCTION generate_job_number()
RETURNS TRIGGER AS $$
DECLARE
  date_part text;


  seq_num integer;


  new_job_number text;


BEGIN
  IF NEW.job_number IS NULL THEN
    date_part := to_char(COALESCE(NEW.move_date, CURRENT_DATE), 'YYMMDD');


    SELECT COALESCE(MAX(
      CAST(SUBSTRING(job_number FROM 'JOB-' || date_part || '-([0-9]+)') AS INTEGER)
    ), 0) + 1
    INTO seq_num
    FROM jobs
    WHERE job_number LIKE 'JOB-' || date_part || '-%';


    
    new_job_number := 'JOB-' || date_part || '-' || LPAD(seq_num::text, 3, '0');


    NEW.job_number := new_job_number;


  END IF;


  RETURN NEW;


END;


$$ LANGUAGE plpgsql;



DROP TRIGGER IF EXISTS generate_job_number_trigger ON jobs;


CREATE TRIGGER generate_job_number_trigger
  BEFORE INSERT ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION generate_job_number();



-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();


  RETURN NEW;


END;


$$ LANGUAGE plpgsql;



-- Apply update triggers
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;


CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();



DROP TRIGGER IF EXISTS update_user_roles_updated_at ON user_roles;


CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();



DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;


CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();



DROP TRIGGER IF EXISTS update_moves_updated_at ON moves;


CREATE TRIGGER update_moves_updated_at
  BEFORE UPDATE ON moves
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();



DROP TRIGGER IF EXISTS update_document_templates_updated_at ON document_templates;


CREATE TRIGGER update_document_templates_updated_at
  BEFORE UPDATE ON document_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();



-- Insert default document templates
INSERT INTO document_templates (template_name, template_type, file_path, version, is_active)
VALUES 
  ('Limited Liability Waiver', 'liability_waiver', 'templates/liability_waiver.pdf', 1, true),
  ('Right of Refusal Policy', 'refusal_policy', 'templates/refusal_policy.pdf', 1, true),
  ('Service Agreement', 'service_agreement', 'templates/service_agreement.pdf', 1, true),
  ('Job Completion Acknowledgment', 'completion_acknowledgment', 'templates/completion_acknowledgment.pdf', 1, true),
  ('No Equipment Work Agreement', 'no_equipment_agreement', 'templates/no_equipment_agreement.pdf', 1, true)
ON CONFLICT DO NOTHING;
