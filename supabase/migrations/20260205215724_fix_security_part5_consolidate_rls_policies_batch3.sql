/*
  # Security Fixes Part 5: Consolidate Overlapping RLS Policies (Batch 3)

  ## Changes Made
  
  ### Policy Consolidation
  Consolidates overlapping permissive policies for:
  - draft_jobs
  - email_throttle_log
  - events
  - interactions
  
  ## Security Impact
  - Clearer security boundaries
  - Improved query performance
  - Easier maintenance
*/

-- ============================================================================
-- DRAFT_JOBS: Consolidate SELECT policies
-- ============================================================================

DROP POLICY IF EXISTS "Dispatchers and admins can read draft jobs" ON draft_jobs;


DROP POLICY IF EXISTS "Service role can manage draft jobs" ON draft_jobs;



CREATE POLICY "Staff can read draft jobs"
  ON draft_jobs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'dispatcher', 'master_admin')
    )
  );



-- DRAFT_JOBS: Consolidate UPDATE policies
DROP POLICY IF EXISTS "Dispatchers and admins can update draft jobs" ON draft_jobs;



CREATE POLICY "Staff can update draft jobs"
  ON draft_jobs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'dispatcher', 'master_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'dispatcher', 'master_admin')
    )
  );



-- ============================================================================
-- EMAIL_THROTTLE_LOG: Consolidate SELECT policies
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all throttle logs" ON email_throttle_log;


DROP POLICY IF EXISTS "Service can manage throttle logs" ON email_throttle_log;


DROP POLICY IF EXISTS "Users can view own throttle logs" ON email_throttle_log;



CREATE POLICY "Users can view throttle logs"
  ON email_throttle_log
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'master_admin')
    )
  );



-- ============================================================================
-- EVENTS: Consolidate SELECT policies
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage all events" ON events;


DROP POLICY IF EXISTS "Users can view events for their jobs" ON events;



CREATE POLICY "Users can view events"
  ON events
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR
    job_id IN (
      SELECT j.id FROM jobs j
      INNER JOIN customers c ON c.id = j.customer_id
      WHERE c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'dispatcher', 'crew', 'master_admin')
    )
  );



-- ============================================================================
-- INTERACTIONS: Consolidate INSERT policies
-- ============================================================================

DROP POLICY IF EXISTS "Admins can create interactions" ON interactions;


DROP POLICY IF EXISTS "Crew can create interactions" ON interactions;


DROP POLICY IF EXISTS "Staff can insert interactions" ON interactions;



CREATE POLICY "Staff can create interactions"
  ON interactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'dispatcher', 'crew', 'master_admin')
    )
  );



-- INTERACTIONS: Consolidate SELECT policies
DROP POLICY IF EXISTS "Admins can read all interactions" ON interactions;


DROP POLICY IF EXISTS "Crew can read interactions for assigned jobs" ON interactions;


DROP POLICY IF EXISTS "Staff can read interactions" ON interactions;


DROP POLICY IF EXISTS "Users can read own interactions" ON interactions;



CREATE POLICY "Users can read interactions"
  ON interactions
  FOR SELECT
  TO authenticated
  USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
    OR
    created_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'dispatcher', 'crew', 'master_admin')
    )
  );



-- INTERACTIONS: Consolidate UPDATE policies
DROP POLICY IF EXISTS "Admins can update any interaction" ON interactions;


DROP POLICY IF EXISTS "Crew can update own interactions" ON interactions;



CREATE POLICY "Staff can update interactions"
  ON interactions
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'dispatcher', 'master_admin')
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'dispatcher', 'master_admin')
    )
  );
