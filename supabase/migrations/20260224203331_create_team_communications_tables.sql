/*
  # Team Communications System

  This migration creates the infrastructure for internal team communications
  including announcements and staff-to-staff messaging.

  1. New Tables
    - `team_announcements`
      - `id` (uuid, primary key)
      - `title` (text) - Announcement headline
      - `content` (text) - Full announcement body
      - `priority` (text) - normal, important, urgent
      - `target_roles` (text[]) - Which roles can see this announcement
      - `attachment_url` (text) - Optional attachment file URL
      - `attachment_name` (text) - Original filename of attachment
      - `attachment_type` (text) - MIME type of attachment
      - `expires_at` (timestamptz) - When announcement should be hidden
      - `created_by` (uuid) - Staff member who created it
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `team_announcement_reads`
      - `id` (uuid, primary key)
      - `announcement_id` (uuid) - References team_announcements
      - `user_id` (uuid) - Staff member who read it
      - `read_at` (timestamptz)

    - `team_messages`
      - `id` (uuid, primary key)
      - `sender_id` (uuid) - Staff member sending
      - `recipient_id` (uuid) - Staff member receiving (null for broadcast)
      - `subject` (text) - Message subject
      - `content` (text) - Message body
      - `priority` (text) - normal, high
      - `is_read` (boolean)
      - `read_at` (timestamptz)
      - `attachment_url` (text)
      - `attachment_name` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Staff can read announcements targeted to their role
    - Staff can read/write their own messages
    - Admins can create announcements
*/

-- Team Announcements table
CREATE TABLE IF NOT EXISTS team_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'urgent')),
  target_roles text[] NOT NULL DEFAULT ARRAY['master_admin', 'admin', 'dispatcher', 'crew'],
  attachment_url text,
  attachment_name text,
  attachment_type text,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Announcement read tracking
CREATE TABLE IF NOT EXISTS team_announcement_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES team_announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

-- Team Messages (staff-to-staff)
CREATE TABLE IF NOT EXISTS team_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id),
  recipient_id uuid REFERENCES auth.users(id),
  subject text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high')),
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  attachment_url text,
  attachment_name text,
  parent_message_id uuid REFERENCES team_messages(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE team_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_messages ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_announcements_active ON team_announcements(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_team_announcements_created ON team_announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_announcement_reads_user ON team_announcement_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_team_messages_recipient ON team_messages(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_team_messages_sender ON team_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_jobs_move_date ON jobs(move_date);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

-- RLS Policies for team_announcements
CREATE POLICY "Staff can view active announcements for their role"
  ON team_announcements FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = ANY(target_roles)
    )
  );

CREATE POLICY "Admins can create announcements"
  ON team_announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('master_admin', 'admin', 'dispatcher')
    )
  );

CREATE POLICY "Admins can update their announcements"
  ON team_announcements FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('master_admin', 'admin')
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('master_admin', 'admin')
    )
  );

CREATE POLICY "Admins can delete announcements"
  ON team_announcements FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('master_admin', 'admin')
    )
  );

-- RLS Policies for team_announcement_reads
CREATE POLICY "Users can mark announcements as read"
  ON team_announcement_reads FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own read status"
  ON team_announcement_reads FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for team_messages
CREATE POLICY "Users can view messages they sent or received"
  ON team_messages FOR SELECT
  TO authenticated
  USING (
    sender_id = auth.uid()
    OR recipient_id = auth.uid()
    OR recipient_id IS NULL
  );

CREATE POLICY "Staff can send messages"
  ON team_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('master_admin', 'admin', 'dispatcher', 'crew')
    )
  );

CREATE POLICY "Recipients can update read status"
  ON team_messages FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- Function to get unread announcement count for current user
CREATE OR REPLACE FUNCTION get_unread_announcements_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*)::integer
  FROM team_announcements ta
  WHERE ta.is_active = true
    AND (ta.expires_at IS NULL OR ta.expires_at > now())
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = ANY(ta.target_roles)
    )
    AND NOT EXISTS (
      SELECT 1 FROM team_announcement_reads tar
      WHERE tar.announcement_id = ta.id
      AND tar.user_id = auth.uid()
    );
$$;

-- Function to search customers by multiple fields
CREATE OR REPLACE FUNCTION search_customers(
  search_term text,
  search_type text DEFAULT 'all'
)
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  phone text,
  address text,
  city text,
  state text,
  total_jobs bigint,
  last_job_date date,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Verify caller is staff
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('master_admin', 'admin', 'dispatcher', 'crew')
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    c.id,
    c.full_name,
    c.email,
    c.phone,
    c.address,
    c.city,
    c.state,
    COALESCE(job_counts.total, 0) as total_jobs,
    job_counts.last_date as last_job_date,
    c.created_at
  FROM customers c
  LEFT JOIN (
    SELECT 
      j.customer_id,
      COUNT(*) as total,
      MAX(j.move_date) as last_date
    FROM jobs j
    GROUP BY j.customer_id
  ) job_counts ON job_counts.customer_id = c.id
  WHERE 
    CASE search_type
      WHEN 'name' THEN c.full_name ILIKE '%' || search_term || '%'
      WHEN 'email' THEN c.email ILIKE '%' || search_term || '%'
      WHEN 'phone' THEN c.phone ILIKE '%' || search_term || '%'
      WHEN 'job_number' THEN EXISTS (
        SELECT 1 FROM jobs j 
        WHERE j.customer_id = c.id 
        AND j.job_number ILIKE '%' || search_term || '%'
      )
      ELSE (
        c.full_name ILIKE '%' || search_term || '%'
        OR c.email ILIKE '%' || search_term || '%'
        OR c.phone ILIKE '%' || search_term || '%'
      )
    END
  ORDER BY c.full_name
  LIMIT 50;
END;
$$;

-- Function to get jobs for calendar view
CREATE OR REPLACE FUNCTION get_calendar_jobs(
  start_date date,
  end_date date
)
RETURNS TABLE (
  id uuid,
  job_number text,
  customer_name text,
  customer_phone text,
  from_address text,
  to_address text,
  move_date date,
  move_time time,
  status text,
  num_movers integer,
  estimated_hours numeric,
  team_lead_id uuid,
  has_deposit boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Verify caller is staff
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('master_admin', 'admin', 'dispatcher', 'crew')
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    j.id,
    j.job_number,
    c.full_name as customer_name,
    c.phone as customer_phone,
    j.from_address,
    j.to_address,
    j.move_date,
    j.move_time,
    j.status,
    j.num_movers,
    j.estimated_hours,
    j.team_lead_id,
    j.deposit_paid as has_deposit
  FROM jobs j
  LEFT JOIN customers c ON c.id = j.customer_id
  WHERE j.move_date >= start_date
    AND j.move_date <= end_date
  ORDER BY j.move_date, j.move_time;
END;
$$;

-- Function to get admin dashboard stats
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  result json;
BEGIN
  -- Verify caller is staff
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('master_admin', 'admin', 'dispatcher')
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT json_build_object(
    'jobs_today', (
      SELECT COUNT(*) FROM jobs 
      WHERE move_date = CURRENT_DATE 
      AND status NOT IN ('cancelled', 'completed')
    ),
    'jobs_this_week', (
      SELECT COUNT(*) FROM jobs 
      WHERE move_date >= date_trunc('week', CURRENT_DATE)
      AND move_date < date_trunc('week', CURRENT_DATE) + interval '7 days'
      AND status NOT IN ('cancelled')
    ),
    'pending_deposits', (
      SELECT COUNT(*) FROM jobs 
      WHERE deposit_paid = false 
      AND status IN ('scheduled', 'confirmed')
      AND move_date >= CURRENT_DATE
    ),
    'pending_approvals', (
      SELECT COUNT(*) FROM draft_jobs 
      WHERE status = 'pending'
    ),
    'total_customers', (
      SELECT COUNT(*) FROM customers
    ),
    'unread_messages', (
      SELECT COUNT(*) FROM team_messages 
      WHERE recipient_id = auth.uid() 
      AND is_read = false
    ),
    'active_crew', (
      SELECT COUNT(*) FROM staff_profiles 
      WHERE availability_status = 'available'
      AND employment_status = 'active'
    ),
    'jobs_in_progress', (
      SELECT COUNT(*) FROM jobs 
      WHERE status = 'in_progress'
    )
  ) INTO result;

  RETURN result;
END;
$$;