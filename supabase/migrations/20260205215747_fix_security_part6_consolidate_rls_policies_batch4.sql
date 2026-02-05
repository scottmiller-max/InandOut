/*
  # Security Fixes Part 6: Consolidate Overlapping RLS Policies (Batch 4)

  ## Changes Made
  
  ### Policy Consolidation
  Consolidates overlapping permissive policies for:
  - job_notifications
  - jobs
  - messages
  - moves
  
  ## Security Impact
  - Clearer security boundaries
  - Improved query performance
  - Easier maintenance
*/

-- ============================================================================
-- JOB_NOTIFICATIONS: Consolidate SELECT policies
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all notifications" ON job_notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON job_notifications;

CREATE POLICY "Users can view notifications"
  ON job_notifications
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
-- JOBS: Consolidate SELECT policies
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage all jobs" ON jobs;
DROP POLICY IF EXISTS "Admins can view all jobs" ON jobs;
DROP POLICY IF EXISTS "Crew can view assigned jobs" ON jobs;
DROP POLICY IF EXISTS "Customers can view their jobs" ON jobs;

CREATE POLICY "Users can view jobs"
  ON jobs
  FOR SELECT
  TO authenticated
  USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'dispatcher', 'crew', 'master_admin')
    )
  );

-- ============================================================================
-- MESSAGES: Consolidate INSERT policies
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage all messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages to their jobs" ON messages;

CREATE POLICY "Users can send messages"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND (
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
    )
  );

-- MESSAGES: Consolidate SELECT policies
DROP POLICY IF EXISTS "Users can view messages for their jobs" ON messages;

CREATE POLICY "Users can view messages"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    sender_id = auth.uid()
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
-- MOVES: Consolidate SELECT policies
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage all moves" ON moves;
DROP POLICY IF EXISTS "Admins can view all moves" ON moves;
DROP POLICY IF EXISTS "Users can view their own moves" ON moves;

CREATE POLICY "Users can view moves"
  ON moves
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'dispatcher', 'master_admin')
    )
  );
