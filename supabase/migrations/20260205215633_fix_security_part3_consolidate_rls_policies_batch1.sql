/*
  # Security Fixes Part 3: Consolidate Overlapping RLS Policies (Batch 1)

  ## Changes Made
  
  ### Policy Consolidation
  Consolidates overlapping permissive policies into single, clear policies for:
  - ai_summaries
  - call_logs
  - contact_submissions
  - customer_photos
  
  ## Security Impact
  - Clearer security boundaries
  - Improved query performance (fewer policy checks)
  - Easier maintenance and auditing
  - No change to actual access patterns
*/

-- ============================================================================
-- AI_SUMMARIES: Consolidate 3 SELECT policies into 1
-- ============================================================================

DROP POLICY IF EXISTS "Admins can read all ai summaries" ON ai_summaries;


DROP POLICY IF EXISTS "Crew can read ai summaries for assigned jobs" ON ai_summaries;


DROP POLICY IF EXISTS "Staff can read AI summaries" ON ai_summaries;



CREATE POLICY "Staff can read AI summaries"
  ON ai_summaries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'dispatcher', 'crew', 'master_admin')
    )
  );



-- ============================================================================
-- CALL_LOGS: Consolidate 3 SELECT policies into 1
-- ============================================================================

DROP POLICY IF EXISTS "Admins can read all call logs" ON call_logs;


DROP POLICY IF EXISTS "Crew can read call logs for assigned jobs" ON call_logs;


DROP POLICY IF EXISTS "Staff can read call logs" ON call_logs;



CREATE POLICY "Staff can read call logs"
  ON call_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'dispatcher', 'crew', 'master_admin')
    )
  );



-- ============================================================================
-- CONTACT_SUBMISSIONS: Consolidate 2 SELECT policies into 1
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all contact submissions" ON contact_submissions;


DROP POLICY IF EXISTS "Staff can read contact submissions" ON contact_submissions;



CREATE POLICY "Staff can read contact submissions"
  ON contact_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'dispatcher', 'master_admin')
    )
  );



-- ============================================================================
-- CUSTOMER_PHOTOS: Consolidate INSERT policies
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage all photos" ON customer_photos;


DROP POLICY IF EXISTS "Users can upload their own photos" ON customer_photos;



CREATE POLICY "Users can upload photos"
  ON customer_photos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'dispatcher', 'crew', 'master_admin')
    )
  );



-- CUSTOMER_PHOTOS: Consolidate SELECT policies
DROP POLICY IF EXISTS "Users can view their own photos" ON customer_photos;



CREATE POLICY "Users can view photos"
  ON customer_photos
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'dispatcher', 'crew', 'master_admin')
    )
  );
