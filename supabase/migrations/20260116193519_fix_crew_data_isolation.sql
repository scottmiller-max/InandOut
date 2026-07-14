/*
  # Fix Crew Data Isolation

  1. Purpose
    - Restrict crew access to call_logs and ai_summaries for assigned jobs only
    - Prevent crew from accessing customer data for unassigned jobs
    - Enforce job assignment validation through RLS policies

  2. Changes
    - Drop broad crew policies on call_logs and ai_summaries
    - Create restrictive policies that filter by job assignment
    - Add interactions table crew policy for consistency

  3. Security Impact
    - Crew can only view data for customers with assigned jobs
    - Direct table queries properly filtered by RLS
    - No access to historical data for unassigned customers
*/

-- Drop existing broad crew policies if they exist
DROP POLICY IF EXISTS "Crew can read all call logs" ON call_logs;


DROP POLICY IF EXISTS "Crew can read all ai summaries" ON ai_summaries;


DROP POLICY IF EXISTS "Crew can read all interactions" ON interactions;



-- Create restricted crew policy for call_logs
CREATE POLICY "Crew can read call logs for assigned jobs"
  ON call_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = (select auth.uid())
      AND ur.role = 'crew'
    )
    AND customer_id IN (
      SELECT j.customer_id FROM jobs j
      WHERE j.team_lead_id = (select auth.uid())
      OR (select auth.uid()) = ANY(j.crew_ids)
    )
  );



-- Create restricted crew policy for ai_summaries
CREATE POLICY "Crew can read ai summaries for assigned jobs"
  ON ai_summaries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = (select auth.uid())
      AND ur.role = 'crew'
    )
    AND customer_id IN (
      SELECT j.customer_id FROM jobs j
      WHERE j.team_lead_id = (select auth.uid())
      OR (select auth.uid()) = ANY(j.crew_ids)
    )
  );



-- Create restricted crew policy for interactions
CREATE POLICY "Crew can read interactions for assigned jobs"
  ON interactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = (select auth.uid())
      AND ur.role = 'crew'
    )
    AND customer_id IN (
      SELECT j.customer_id FROM jobs j
      WHERE j.team_lead_id = (select auth.uid())
      OR (select auth.uid()) = ANY(j.crew_ids)
    )
  );



-- Add indexes for performance on job assignment lookups
CREATE INDEX IF NOT EXISTS idx_jobs_team_lead_id ON jobs(team_lead_id);


CREATE INDEX IF NOT EXISTS idx_jobs_crew_ids ON jobs USING GIN(crew_ids);


CREATE INDEX IF NOT EXISTS idx_call_logs_customer_id ON call_logs(customer_id);


CREATE INDEX IF NOT EXISTS idx_ai_summaries_customer_id ON ai_summaries(customer_id);


CREATE INDEX IF NOT EXISTS idx_interactions_customer_id ON interactions(customer_id);
