/*
  # Enable RLS on AI Summaries and Call Logs Tables

  1. Changes to ai_summaries
    - Enable Row Level Security
    - Add missing columns: job_id, call_log_id, summary_type, content, metadata, updated_at
    - Create admin/crew access policies (no customer access)

  2. Changes to call_logs
    - Enable Row Level Security
    - Add missing columns: caller_id, transcript, vapi_call_id, call_direction, call_status, duration, metadata, updated_at
    - Create admin/crew access policies (no customer access)

  3. Security Model
    - Admins and master_admins have full CRUD access
    - Crew members have read-only access
    - Customers have NO access to these internal tables
*/

-- =====================================================
-- STEP 1: Add missing columns to call_logs
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'call_logs' AND column_name = 'caller_id'
  ) THEN
    ALTER TABLE call_logs ADD COLUMN caller_id text;


  END IF;


END $$;



DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'call_logs' AND column_name = 'transcript'
  ) THEN
    ALTER TABLE call_logs ADD COLUMN transcript text;


  END IF;


END $$;



DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'call_logs' AND column_name = 'vapi_call_id'
  ) THEN
    ALTER TABLE call_logs ADD COLUMN vapi_call_id text;


  END IF;


END $$;



DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'call_logs' AND column_name = 'call_direction'
  ) THEN
    ALTER TABLE call_logs ADD COLUMN call_direction text DEFAULT 'inbound' CHECK (call_direction IN ('inbound', 'outbound'));


  END IF;


END $$;



DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'call_logs' AND column_name = 'call_status'
  ) THEN
    ALTER TABLE call_logs ADD COLUMN call_status text DEFAULT 'completed' CHECK (call_status IN ('completed', 'missed', 'failed', 'voicemail', 'busy', 'no_answer'));


  END IF;


END $$;



DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'call_logs' AND column_name = 'duration'
  ) THEN
    ALTER TABLE call_logs ADD COLUMN duration integer DEFAULT 0;


  END IF;


END $$;



DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'call_logs' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE call_logs ADD COLUMN metadata jsonb DEFAULT '{}';


  END IF;


END $$;



DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'call_logs' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE call_logs ADD COLUMN updated_at timestamptz DEFAULT now();


  END IF;


END $$;



-- Create indexes for call_logs new columns
CREATE INDEX IF NOT EXISTS idx_call_logs_vapi_call_id ON call_logs(vapi_call_id);


CREATE INDEX IF NOT EXISTS idx_call_logs_customer_id ON call_logs(customer_id);


CREATE INDEX IF NOT EXISTS idx_call_logs_created_at ON call_logs(created_at DESC);



-- =====================================================
-- STEP 2: Add missing columns to ai_summaries
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_summaries' AND column_name = 'job_id'
  ) THEN
    ALTER TABLE ai_summaries ADD COLUMN job_id uuid REFERENCES jobs(id) ON DELETE SET NULL;


  END IF;


END $$;



DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_summaries' AND column_name = 'call_log_id'
  ) THEN
    ALTER TABLE ai_summaries ADD COLUMN call_log_id uuid REFERENCES call_logs(id) ON DELETE SET NULL;


  END IF;


END $$;



DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_summaries' AND column_name = 'summary_type'
  ) THEN
    ALTER TABLE ai_summaries ADD COLUMN summary_type text DEFAULT 'call_transcription' CHECK (summary_type IN ('call_transcription', 'move_summary'));


  END IF;


END $$;



DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_summaries' AND column_name = 'content'
  ) THEN
    ALTER TABLE ai_summaries ADD COLUMN content text;


  END IF;


END $$;



DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_summaries' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE ai_summaries ADD COLUMN metadata jsonb DEFAULT '{}';


  END IF;


END $$;



DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_summaries' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE ai_summaries ADD COLUMN updated_at timestamptz DEFAULT now();


  END IF;


END $$;



-- Create indexes for ai_summaries
CREATE INDEX IF NOT EXISTS idx_ai_summaries_customer_id ON ai_summaries(customer_id);


CREATE INDEX IF NOT EXISTS idx_ai_summaries_job_id ON ai_summaries(job_id);


CREATE INDEX IF NOT EXISTS idx_ai_summaries_call_log_id ON ai_summaries(call_log_id);


CREATE INDEX IF NOT EXISTS idx_ai_summaries_summary_type ON ai_summaries(summary_type);



-- =====================================================
-- STEP 3: Enable RLS on both tables
-- =====================================================

ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;


ALTER TABLE ai_summaries ENABLE ROW LEVEL SECURITY;



-- =====================================================
-- STEP 4: Create RLS policies for call_logs
-- =====================================================

-- Admins can read all call logs
CREATE POLICY "Admins can read all call logs"
  ON call_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.role IN ('admin', 'master_admin')
    )
  );



-- Crew can read all call logs
CREATE POLICY "Crew can read all call logs"
  ON call_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.role = 'crew'
    )
  );



-- Admins can insert call logs
CREATE POLICY "Admins can insert call logs"
  ON call_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.role IN ('admin', 'master_admin')
    )
  );



-- Admins can update call logs
CREATE POLICY "Admins can update call logs"
  ON call_logs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.role IN ('admin', 'master_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.role IN ('admin', 'master_admin')
    )
  );



-- Admins can delete call logs
CREATE POLICY "Admins can delete call logs"
  ON call_logs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.role IN ('admin', 'master_admin')
    )
  );



-- =====================================================
-- STEP 5: Create RLS policies for ai_summaries
-- =====================================================

-- Admins can read all AI summaries
CREATE POLICY "Admins can read all ai summaries"
  ON ai_summaries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.role IN ('admin', 'master_admin')
    )
  );



-- Crew can read all AI summaries
CREATE POLICY "Crew can read all ai summaries"
  ON ai_summaries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.role = 'crew'
    )
  );



-- Admins can insert AI summaries
CREATE POLICY "Admins can insert ai summaries"
  ON ai_summaries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.role IN ('admin', 'master_admin')
    )
  );



-- Admins can update AI summaries
CREATE POLICY "Admins can update ai summaries"
  ON ai_summaries
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.role IN ('admin', 'master_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.role IN ('admin', 'master_admin')
    )
  );



-- Admins can delete AI summaries
CREATE POLICY "Admins can delete ai summaries"
  ON ai_summaries
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.role IN ('admin', 'master_admin')
    )
  );



-- =====================================================
-- STEP 6: Create updated_at triggers
-- =====================================================

CREATE OR REPLACE FUNCTION update_call_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();


  RETURN NEW;


END;


$$ LANGUAGE plpgsql;



DROP TRIGGER IF EXISTS trigger_call_logs_updated_at ON call_logs;


CREATE TRIGGER trigger_call_logs_updated_at
  BEFORE UPDATE ON call_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_call_logs_updated_at();



CREATE OR REPLACE FUNCTION update_ai_summaries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();


  RETURN NEW;


END;


$$ LANGUAGE plpgsql;



DROP TRIGGER IF EXISTS trigger_ai_summaries_updated_at ON ai_summaries;


CREATE TRIGGER trigger_ai_summaries_updated_at
  BEFORE UPDATE ON ai_summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_summaries_updated_at();



-- Add comments for documentation
COMMENT ON TABLE call_logs IS 'Stores phone call logs including VAPI integration data';


COMMENT ON TABLE ai_summaries IS 'Stores AI-generated summaries for calls and moves';
