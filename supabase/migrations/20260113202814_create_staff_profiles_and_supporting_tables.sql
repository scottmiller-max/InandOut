/*
  # Create Staff Profiles and Supporting Tables

  1. New Tables
    - `staff_profiles` - Employment details for non-customer users (crew, dispatcher, admin)
    - `draft_jobs` - Riley AI job suggestions requiring dispatcher approval
    - `audit_log` - Tracking sensitive actions across the system

  2. Changes to staff_profiles
    - Links to auth.users and user_roles
    - Stores employment information (hire_date, department, position)
    - Emergency contact details
    - Availability status

  3. Changes to draft_jobs
    - Created by Riley with handled_by = 'riley'
    - Requires dispatcher/admin approval
    - Can be promoted to full jobs or rejected
    - Tracks approval workflow

  4. Changes to audit_log
    - Captures all sensitive operations
    - Records user, role, action type, affected entity
    - Queryable by admins for compliance

  5. Security
    - Enable RLS on all tables
    - Staff profiles readable by admins/dispatchers
    - Draft jobs readable by dispatchers/admins
    - Audit log readable by master_admin only
*/

-- Create staff_profiles table
CREATE TABLE IF NOT EXISTS staff_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  employee_id text UNIQUE,
  position text NOT NULL DEFAULT '',
  department text NOT NULL DEFAULT '',
  hire_date date,
  employment_status text NOT NULL DEFAULT 'active' CHECK (employment_status IN ('active', 'on_leave', 'inactive', 'terminated')),
  phone_number text,
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text,
  notes text,
  availability_status text NOT NULL DEFAULT 'available' CHECK (availability_status IN ('available', 'on_job', 'off_duty', 'unavailable')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);



-- Create draft_jobs table for Riley AI suggestions
CREATE TABLE IF NOT EXISTS draft_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  job_data jsonb NOT NULL DEFAULT '{}',
  riley_notes text,
  riley_confidence_score numeric(3,2) CHECK (riley_confidence_score >= 0 AND riley_confidence_score <= 1),
  source_interaction_ids uuid[],
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'converted')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  rejection_reason text,
  converted_job_id uuid REFERENCES jobs(id),
  created_by text NOT NULL DEFAULT 'riley',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);



-- Create audit_log table
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  user_role text,
  action_type text NOT NULL,
  action_category text NOT NULL CHECK (action_category IN ('auth', 'crm', 'jobs', 'roles', 'settings', 'messaging', 'data')),
  affected_entity_type text,
  affected_entity_id uuid,
  action_details jsonb DEFAULT '{}',
  ip_address text,
  user_agent text,
  success boolean DEFAULT true,
  error_message text,
  created_at timestamptz DEFAULT now()
);



-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_staff_profiles_user_id ON staff_profiles(user_id);


CREATE INDEX IF NOT EXISTS idx_staff_profiles_status ON staff_profiles(employment_status);


CREATE INDEX IF NOT EXISTS idx_staff_profiles_availability ON staff_profiles(availability_status);



CREATE INDEX IF NOT EXISTS idx_draft_jobs_customer_id ON draft_jobs(customer_id);


CREATE INDEX IF NOT EXISTS idx_draft_jobs_status ON draft_jobs(status);


CREATE INDEX IF NOT EXISTS idx_draft_jobs_created_at ON draft_jobs(created_at DESC);



CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);


CREATE INDEX IF NOT EXISTS idx_audit_log_action_type ON audit_log(action_type);


CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);


CREATE INDEX IF NOT EXISTS idx_audit_log_category ON audit_log(action_category);



-- Enable RLS
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;


ALTER TABLE draft_jobs ENABLE ROW LEVEL SECURITY;


ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;



-- RLS Policies for staff_profiles

-- Staff can read their own profile
CREATE POLICY "Staff can read own profile"
  ON staff_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));



-- Admins and dispatchers can read all staff profiles
CREATE POLICY "Admins and dispatchers can read all staff profiles"
  ON staff_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('master_admin', 'admin', 'dispatcher')
    )
  );



-- Only admins can modify staff profiles
CREATE POLICY "Admins can manage staff profiles"
  ON staff_profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('master_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('master_admin', 'admin')
    )
  );



-- Service role can manage (for edge functions)
CREATE POLICY "Service role can manage staff profiles"
  ON staff_profiles
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');



-- RLS Policies for draft_jobs

-- Dispatchers and admins can read draft jobs
CREATE POLICY "Dispatchers and admins can read draft jobs"
  ON draft_jobs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('master_admin', 'admin', 'dispatcher')
    )
  );



-- Dispatchers and admins can update draft jobs (approve/reject)
CREATE POLICY "Dispatchers and admins can update draft jobs"
  ON draft_jobs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('master_admin', 'admin', 'dispatcher')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('master_admin', 'admin', 'dispatcher')
    )
  );



-- Service role can create draft jobs (Riley AI)
CREATE POLICY "Service role can create draft jobs"
  ON draft_jobs
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');



-- Service role can manage draft jobs
CREATE POLICY "Service role can manage draft jobs"
  ON draft_jobs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');



-- RLS Policies for audit_log

-- Only master admin can read audit logs
CREATE POLICY "Master admin can read audit logs"
  ON audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = 'master_admin'
    )
  );



-- Service role can insert audit logs
CREATE POLICY "Service role can insert audit logs"
  ON audit_log
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');



-- Create triggers for updated_at
CREATE TRIGGER update_staff_profiles_updated_at
  BEFORE UPDATE ON staff_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();



CREATE TRIGGER update_draft_jobs_updated_at
  BEFORE UPDATE ON draft_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();



-- Add comments
COMMENT ON TABLE staff_profiles IS 'Employment details for staff members (crew, dispatcher, admin). Links to user_roles for permission checking.';


COMMENT ON TABLE draft_jobs IS 'Job suggestions created by Riley AI requiring dispatcher/admin approval before becoming actual jobs.';


COMMENT ON TABLE audit_log IS 'System-wide audit trail for sensitive operations. Only accessible to master_admin for compliance and security reviews.';
