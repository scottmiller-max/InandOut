/*
  # Fix Security and Performance Issues - Part 2: RLS Optimization

  1. RLS Performance Optimization
    - Fix all RLS policies to use `(select auth.uid())` instead of `auth.uid()`
    - This prevents re-evaluation of auth functions for each row
    - Improves query performance at scale by evaluating the function once per query

  2. Security
    - All policies maintain the same security model
    - Only the performance characteristics are improved
*/

-- =====================================================
-- STEP 1: Fix RLS policies - project_settings table
-- =====================================================

DROP POLICY IF EXISTS "Users can view own settings" ON public.project_settings;


DROP POLICY IF EXISTS "Users can insert own settings" ON public.project_settings;


DROP POLICY IF EXISTS "Users can update own settings" ON public.project_settings;


DROP POLICY IF EXISTS "Users can delete own settings" ON public.project_settings;



CREATE POLICY "Users can view own settings"
  ON public.project_settings FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));



CREATE POLICY "Users can insert own settings"
  ON public.project_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));



CREATE POLICY "Users can update own settings"
  ON public.project_settings FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));



CREATE POLICY "Users can delete own settings"
  ON public.project_settings FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));



-- =====================================================
-- STEP 2: Fix RLS policies - project_files table
-- =====================================================

DROP POLICY IF EXISTS "Users can view own files" ON public.project_files;


DROP POLICY IF EXISTS "Users can insert own files" ON public.project_files;


DROP POLICY IF EXISTS "Users can update own files" ON public.project_files;


DROP POLICY IF EXISTS "Users can delete own files" ON public.project_files;



CREATE POLICY "Users can view own files"
  ON public.project_files FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));



CREATE POLICY "Users can insert own files"
  ON public.project_files FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));



CREATE POLICY "Users can update own files"
  ON public.project_files FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));



CREATE POLICY "Users can delete own files"
  ON public.project_files FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));



-- =====================================================
-- STEP 3: Fix RLS policies - stripe tables
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own customer data" ON public.stripe_customers;


CREATE POLICY "Users can view their own customer data"
  ON public.stripe_customers FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));



DROP POLICY IF EXISTS "Users can view their own subscription data" ON public.stripe_subscriptions;


CREATE POLICY "Users can view their own subscription data"
  ON public.stripe_subscriptions FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id FROM public.stripe_customers
      WHERE user_id = (select auth.uid())
    )
  );



DROP POLICY IF EXISTS "Users can view their own order data" ON public.stripe_orders;


CREATE POLICY "Users can view their own order data"
  ON public.stripe_orders FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id FROM public.stripe_customers
      WHERE user_id = (select auth.uid())
    )
  );



-- =====================================================
-- STEP 4: Fix RLS policies - user_roles table
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;


DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;


DROP POLICY IF EXISTS "Master admins can manage roles" ON public.user_roles;


DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;


DROP POLICY IF EXISTS "Users can insert own customer role" ON public.user_roles;



CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));



CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (select auth.uid())
      AND ur.role IN ('admin', 'master_admin')
    )
  );



CREATE POLICY "Master admins can manage roles"
  ON public.user_roles
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (select auth.uid())
      AND ur.role = 'master_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (select auth.uid())
      AND ur.role = 'master_admin'
    )
  );



CREATE POLICY "Users can insert own role"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()) AND role = 'customer');



CREATE POLICY "Users can insert own customer role"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()) AND role = 'customer');



-- =====================================================
-- STEP 5: Fix RLS policies - customers table
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own customer record" ON public.customers;


DROP POLICY IF EXISTS "Admins can view all customers" ON public.customers;


DROP POLICY IF EXISTS "Admins can manage all customers" ON public.customers;



CREATE POLICY "Users can view their own customer record"
  ON public.customers FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));



CREATE POLICY "Admins can view all customers"
  ON public.customers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (select auth.uid())
      AND ur.role IN ('admin', 'master_admin')
    )
  );



CREATE POLICY "Admins can manage all customers"
  ON public.customers
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (select auth.uid())
      AND ur.role IN ('admin', 'master_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (select auth.uid())
      AND ur.role IN ('admin', 'master_admin')
    )
  );



-- =====================================================
-- STEP 6: Fix RLS policies - jobs table
-- =====================================================

DROP POLICY IF EXISTS "Customers can view their jobs" ON public.jobs;


DROP POLICY IF EXISTS "Admins can view all jobs" ON public.jobs;


DROP POLICY IF EXISTS "Admins can manage all jobs" ON public.jobs;



CREATE POLICY "Customers can view their jobs"
  ON public.jobs FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM public.customers 
      WHERE user_id = (select auth.uid())
    )
  );



CREATE POLICY "Admins can view all jobs"
  ON public.jobs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (select auth.uid())
      AND ur.role IN ('admin', 'master_admin')
    )
  );



CREATE POLICY "Admins can manage all jobs"
  ON public.jobs
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (select auth.uid())
      AND ur.role IN ('admin', 'master_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (select auth.uid())
      AND ur.role IN ('admin', 'master_admin')
    )
  );



-- =====================================================
-- STEP 7: Fix RLS policies - moves table
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own moves" ON public.moves;


DROP POLICY IF EXISTS "Admins can view all moves" ON public.moves;


DROP POLICY IF EXISTS "Admins can manage all moves" ON public.moves;



CREATE POLICY "Users can view their own moves"
  ON public.moves FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));



CREATE POLICY "Admins can view all moves"
  ON public.moves FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (select auth.uid())
      AND ur.role IN ('admin', 'master_admin')
    )
  );



CREATE POLICY "Admins can manage all moves"
  ON public.moves
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (select auth.uid())
      AND ur.role IN ('admin', 'master_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (select auth.uid())
      AND ur.role IN ('admin', 'master_admin')
    )
  );



-- =====================================================
-- STEP 8: Fix RLS policies - messages table
-- =====================================================

DROP POLICY IF EXISTS "Users can view messages for their jobs" ON public.messages;


DROP POLICY IF EXISTS "Users can send messages to their jobs" ON public.messages;


DROP POLICY IF EXISTS "Admins can manage all messages" ON public.messages;



CREATE POLICY "Users can view messages for their jobs"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    job_id IN (
      SELECT j.id FROM public.jobs j
      JOIN public.customers c ON c.id = j.customer_id
      WHERE c.user_id = (select auth.uid())
    )
  );



CREATE POLICY "Users can send messages to their jobs"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = (select auth.uid()) AND
    job_id IN (
      SELECT j.id FROM public.jobs j
      JOIN public.customers c ON c.id = j.customer_id
      WHERE c.user_id = (select auth.uid())
    )
  );



CREATE POLICY "Admins can manage all messages"
  ON public.messages
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (select auth.uid())
      AND ur.role IN ('admin', 'master_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (select auth.uid())
      AND ur.role IN ('admin', 'master_admin')
    )
  );



-- =====================================================
-- STEP 9: Fix RLS policies - events table
-- =====================================================

DROP POLICY IF EXISTS "Users can view events for their jobs" ON public.events;


DROP POLICY IF EXISTS "Admins can manage all events" ON public.events;



CREATE POLICY "Users can view events for their jobs"
  ON public.events FOR SELECT
  TO authenticated
  USING (
    job_id IN (
      SELECT j.id FROM public.jobs j
      JOIN public.customers c ON c.id = j.customer_id
      WHERE c.user_id = (select auth.uid())
    )
  );



CREATE POLICY "Admins can manage all events"
  ON public.events
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (select auth.uid())
      AND ur.role IN ('admin', 'master_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (select auth.uid())
      AND ur.role IN ('admin', 'master_admin')
    )
  );



-- =====================================================
-- STEP 10: Fix RLS policies - customer_photos table
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own photos" ON public.customer_photos;


DROP POLICY IF EXISTS "Users can upload their own photos" ON public.customer_photos;


DROP POLICY IF EXISTS "Admins can manage all photos" ON public.customer_photos;



CREATE POLICY "Users can view their own photos"
  ON public.customer_photos FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));



CREATE POLICY "Users can upload their own photos"
  ON public.customer_photos FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));



CREATE POLICY "Admins can manage all photos"
  ON public.customer_photos
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (select auth.uid())
      AND ur.role IN ('admin', 'master_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (select auth.uid())
      AND ur.role IN ('admin', 'master_admin')
    )
  );



-- =====================================================
-- STEP 11: Fix RLS policies - document_templates table
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage templates" ON public.document_templates;


DROP POLICY IF EXISTS "All authenticated users can view active templates" ON public.document_templates;



CREATE POLICY "Admins can manage templates"
  ON public.document_templates
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (select auth.uid())
      AND ur.role IN ('admin', 'master_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (select auth.uid())
      AND ur.role IN ('admin', 'master_admin')
    )
  );



CREATE POLICY "All authenticated users can view active templates"
  ON public.document_templates FOR SELECT
  TO authenticated
  USING (is_active = true);



-- =====================================================
-- STEP 12: Fix RLS policies - users table
-- =====================================================

DROP POLICY IF EXISTS "Users can read own data" ON public.users;


DROP POLICY IF EXISTS "Users can insert own data" ON public.users;


DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;


DROP POLICY IF EXISTS "Users can update own data" ON public.users;


DROP POLICY IF EXISTS "Admins can view all users" ON public.users;



CREATE POLICY "Users can read own data"
  ON public.users FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));



CREATE POLICY "Users can insert own data"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));



CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));



CREATE POLICY "Users can update own data"
  ON public.users FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));



CREATE POLICY "Admins can view all users"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (select auth.uid())
      AND ur.role IN ('admin', 'master_admin')
    )
  );
