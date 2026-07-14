/*
  # Fix Security and Performance Issues

  1. Performance Optimizations
    - Add missing foreign key indexes (13 foreign keys)
    - Indexes added:
      - ai_summaries: call_log_id, customer_id, job_id
      - call_logs: customer_id
      - contact_submissions: customer_id
      - customer_photos: move_id
      - draft_jobs: customer_id
      - events: created_by
      - interactions: contact_submission_id, created_by, customer_id
      - job_notifications: job_id
      - user_roles: assigned_by

  2. RLS Performance Optimization
    - Fix auth.uid() calls to use (SELECT auth.uid()) pattern
    - Prevents re-evaluation on each row (19 policies updated)
    - Tables affected:
      - documents_registry
      - document_acknowledgements
      - job_notifications
      - email_throttle_log
      - role_permissions
      - staff_profiles
      - draft_jobs
      - audit_log

  3. Security Hardening
    - Set search_path on SECURITY DEFINER functions
    - Prevents search_path hijacking attacks
    - Functions fixed:
      - sync_staff_profile_role()
      - manage_document_version()
      - update_documents_registry_updated_at()

  4. RLS Policy Consolidation
    - Consolidate overlapping permissive policies where appropriate
    - Maintain backward compatibility
    - Focus on service_role policies that overlap with user policies
*/

-- =====================================================
-- STEP 1: Add Missing Foreign Key Indexes
-- =====================================================

-- ai_summaries foreign key indexes
CREATE INDEX IF NOT EXISTS idx_ai_summaries_call_log_id 
  ON ai_summaries(call_log_id);



CREATE INDEX IF NOT EXISTS idx_ai_summaries_customer_id 
  ON ai_summaries(customer_id);



CREATE INDEX IF NOT EXISTS idx_ai_summaries_job_id 
  ON ai_summaries(job_id);



-- call_logs foreign key indexes
CREATE INDEX IF NOT EXISTS idx_call_logs_customer_id 
  ON call_logs(customer_id);



-- contact_submissions foreign key indexes
CREATE INDEX IF NOT EXISTS idx_contact_submissions_customer_id 
  ON contact_submissions(customer_id);



-- customer_photos foreign key indexes
CREATE INDEX IF NOT EXISTS idx_customer_photos_move_id 
  ON customer_photos(move_id);



-- draft_jobs foreign key indexes
CREATE INDEX IF NOT EXISTS idx_draft_jobs_customer_id 
  ON draft_jobs(customer_id);



-- events foreign key indexes
CREATE INDEX IF NOT EXISTS idx_events_created_by 
  ON events(created_by);



-- interactions foreign key indexes
CREATE INDEX IF NOT EXISTS idx_interactions_contact_submission_id 
  ON interactions(contact_submission_id);



CREATE INDEX IF NOT EXISTS idx_interactions_created_by 
  ON interactions(created_by);



CREATE INDEX IF NOT EXISTS idx_interactions_customer_id 
  ON interactions(customer_id);



-- job_notifications foreign key indexes
CREATE INDEX IF NOT EXISTS idx_job_notifications_job_id 
  ON job_notifications(job_id);



-- user_roles foreign key indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_assigned_by 
  ON user_roles(assigned_by);



-- =====================================================
-- STEP 2: Fix RLS Policies - documents_registry
-- =====================================================

DROP POLICY IF EXISTS "Service role full access to documents_registry" ON documents_registry;


CREATE POLICY "Service role full access to documents_registry"
  ON documents_registry
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');



DROP POLICY IF EXISTS "Master admin full access to documents_registry" ON documents_registry;


CREATE POLICY "Master admin full access to documents_registry"
  ON documents_registry
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role = 'master_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role = 'master_admin'
    )
  );



DROP POLICY IF EXISTS "Admin and dispatcher can read all documents" ON documents_registry;


CREATE POLICY "Admin and dispatcher can read all documents"
  ON documents_registry
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role IN ('admin', 'dispatcher')
    )
  );



DROP POLICY IF EXISTS "Admin and dispatcher can update documents" ON documents_registry;


CREATE POLICY "Admin and dispatcher can update documents"
  ON documents_registry
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role IN ('admin', 'dispatcher')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role IN ('admin', 'dispatcher')
    )
  );



DROP POLICY IF EXISTS "Admin and dispatcher can insert documents" ON documents_registry;


CREATE POLICY "Admin and dispatcher can insert documents"
  ON documents_registry
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role IN ('admin', 'dispatcher')
    )
    AND created_by = (SELECT auth.uid())
  );



-- =====================================================
-- STEP 3: Fix RLS Policies - document_acknowledgements
-- =====================================================

DROP POLICY IF EXISTS "Service role full access to acknowledgements" ON document_acknowledgements;


CREATE POLICY "Service role full access to acknowledgements"
  ON document_acknowledgements
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');



DROP POLICY IF EXISTS "Master admin can read all acknowledgements" ON document_acknowledgements;


CREATE POLICY "Master admin can read all acknowledgements"
  ON document_acknowledgements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role = 'master_admin'
    )
  );



DROP POLICY IF EXISTS "Admin and dispatcher can read acknowledgements" ON document_acknowledgements;


CREATE POLICY "Admin and dispatcher can read acknowledgements"
  ON document_acknowledgements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role IN ('admin', 'dispatcher')
    )
  );



DROP POLICY IF EXISTS "Users can read own acknowledgements" ON document_acknowledgements;


CREATE POLICY "Users can read own acknowledgements"
  ON document_acknowledgements
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));



DROP POLICY IF EXISTS "Users can insert own acknowledgements" ON document_acknowledgements;


CREATE POLICY "Users can insert own acknowledgements"
  ON document_acknowledgements
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));



-- =====================================================
-- STEP 4: Fix RLS Policies - job_notifications
-- =====================================================

DROP POLICY IF EXISTS "Service can insert notifications" ON job_notifications;


CREATE POLICY "Service can insert notifications"
  ON job_notifications
  FOR INSERT
  WITH CHECK ((SELECT auth.role()) = 'service_role');



DROP POLICY IF EXISTS "Service can update notification status" ON job_notifications;


CREATE POLICY "Service can update notification status"
  ON job_notifications
  FOR UPDATE
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');



-- =====================================================
-- STEP 5: Fix RLS Policies - email_throttle_log
-- =====================================================

DROP POLICY IF EXISTS "Service can manage throttle logs" ON email_throttle_log;


CREATE POLICY "Service can manage throttle logs"
  ON email_throttle_log
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');



-- =====================================================
-- STEP 6: Fix RLS Policies - role_permissions
-- =====================================================

DROP POLICY IF EXISTS "Service role can manage permissions" ON role_permissions;


CREATE POLICY "Service role can manage permissions"
  ON role_permissions
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');



-- =====================================================
-- STEP 7: Fix RLS Policies - staff_profiles
-- =====================================================

DROP POLICY IF EXISTS "Service role can manage staff profiles" ON staff_profiles;


CREATE POLICY "Service role can manage staff profiles"
  ON staff_profiles
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');



-- =====================================================
-- STEP 8: Fix RLS Policies - draft_jobs
-- =====================================================

DROP POLICY IF EXISTS "Service role can create draft jobs" ON draft_jobs;


CREATE POLICY "Service role can create draft jobs"
  ON draft_jobs
  FOR INSERT
  WITH CHECK ((SELECT auth.role()) = 'service_role');



DROP POLICY IF EXISTS "Service role can manage draft jobs" ON draft_jobs;


CREATE POLICY "Service role can manage draft jobs"
  ON draft_jobs
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');



-- =====================================================
-- STEP 9: Fix RLS Policies - audit_log
-- =====================================================

DROP POLICY IF EXISTS "Master admin can read audit logs" ON audit_log;


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



DROP POLICY IF EXISTS "Service role can insert audit logs" ON audit_log;


CREATE POLICY "Service role can insert audit logs"
  ON audit_log
  FOR INSERT
  WITH CHECK ((SELECT auth.role()) = 'service_role');



-- =====================================================
-- STEP 10: Fix Function Search Paths (Security Hardening)
-- =====================================================

CREATE OR REPLACE FUNCTION sync_staff_profile_role()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE staff_profiles
  SET role = NEW.role
  WHERE user_id = NEW.user_id;


  RETURN NEW;


END;


$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_temp;



CREATE OR REPLACE FUNCTION manage_document_version()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.active = true THEN
    UPDATE documents_registry
    SET 
      active = false,
      superseded_at = now()
    WHERE 
      document_type = NEW.document_type
      AND active = true
      AND id != NEW.id;


  END IF;


  RETURN NEW;


END;


$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_temp;



CREATE OR REPLACE FUNCTION update_documents_registry_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();


  RETURN NEW;


END;


$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;



-- =====================================================
-- STEP 11: Consolidate Duplicate RLS Policies
-- =====================================================

-- Remove redundant service_role INSERT policy on draft_jobs (covered by ALL policy)
-- The "Service role can create draft jobs" is redundant with "Service role can manage draft jobs"
-- Keep the ALL policy as it's more comprehensive
DROP POLICY IF EXISTS "Service role can create draft jobs" ON draft_jobs;



-- Note: We're keeping the ALL policy which covers INSERT, SELECT, UPDATE, DELETE

-- =====================================================
-- STEP 12: Add Comments for Documentation
-- =====================================================

COMMENT ON POLICY "Service role full access to documents_registry" ON documents_registry IS 
  'Service role has full access for Edge Functions. Uses SELECT wrapper to prevent per-row re-evaluation.';



COMMENT ON POLICY "Master admin full access to documents_registry" ON documents_registry IS 
  'Master admin full access. Uses SELECT wrapper for auth.uid() to optimize performance at scale.';



COMMENT ON POLICY "Service role full access to acknowledgements" ON document_acknowledgements IS 
  'Service role full access for Edge Functions. Optimized with SELECT wrapper.';



COMMENT ON FUNCTION sync_staff_profile_role() IS 
  'Syncs role from user_roles to staff_profiles. SECURITY DEFINER with hardened search_path.';



COMMENT ON FUNCTION manage_document_version() IS 
  'Manages document version supersession. SECURITY DEFINER with hardened search_path to prevent search_path hijacking.';



COMMENT ON FUNCTION update_documents_registry_updated_at() IS 
  'Updates updated_at timestamp. Hardened search_path set to prevent attacks.';
