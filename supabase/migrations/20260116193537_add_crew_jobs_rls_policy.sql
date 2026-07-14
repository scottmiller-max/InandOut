/*
  # Add Crew Jobs RLS Policy

  1. Purpose
    - Explicitly define crew access to jobs table via RLS
    - Ensure crew can only view assigned jobs through direct queries
    - Complement edge function security with database-level enforcement

  2. Changes
    - Add crew SELECT policy for jobs table
    - Filter by team_lead_id or crew_ids array membership
    - No INSERT/UPDATE/DELETE permissions for crew

  3. Security Impact
    - Crew members cannot see unassigned jobs via direct queries
    - RLS explicitly enforces job assignment restrictions
    - Edge function and direct access both properly filtered
*/

-- Add explicit crew policy for jobs table
CREATE POLICY "Crew can view assigned jobs"
  ON jobs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
      AND role = 'crew'
    )
    AND (
      team_lead_id = (select auth.uid())
      OR (select auth.uid()) = ANY(crew_ids)
    )
  );
