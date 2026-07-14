/*
  # Riley AI Integration Schema Enhancements

  1. Schema Changes
    - interactions table:
      - Update handled_by check constraint to include 'riley' value
      - Add index on handled_by for efficient Riley interaction queries
      - Add composite index on customer_id + created_at for conversation history

    - ai_summaries table:
      - Add trigger_event column to track what triggered the summary
      - Update summary_type constraint to include additional types
      - Add index on customer_id + generated_at for latest summary queries

    - call_logs table:
      - Add index on customer_id for customer call history queries
      - Add action_items and follow_ups columns for Riley call processing

  2. Security
    - No RLS changes needed (tables already have RLS enabled)
    - Riley writes happen via edge functions using service role key

  3. Notes
    - Riley can now be tracked as a distinct handler in interactions
    - Summary triggers provide audit trail for when/why summaries were generated
    - Indexes optimize the most common Riley query patterns
*/

-- Update interactions.handled_by constraint to include 'riley'
DO $$
BEGIN
  ALTER TABLE interactions DROP CONSTRAINT IF EXISTS interactions_handled_by_check;


  ALTER TABLE interactions ADD CONSTRAINT interactions_handled_by_check
    CHECK (handled_by IS NULL OR (handled_by = ANY (ARRAY['human'::text, 'ai'::text, 'system'::text, 'riley'::text])));


END $$;



-- Add index on interactions.handled_by for efficient Riley queries
CREATE INDEX IF NOT EXISTS idx_interactions_handled_by ON interactions(handled_by);



-- Add composite index for conversation history retrieval
CREATE INDEX IF NOT EXISTS idx_interactions_customer_created ON interactions(customer_id, created_at DESC);



-- Add trigger_event column to ai_summaries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_summaries' AND column_name = 'trigger_event'
  ) THEN
    ALTER TABLE ai_summaries ADD COLUMN trigger_event text;


    ALTER TABLE ai_summaries ADD CONSTRAINT ai_summaries_trigger_event_check
      CHECK (trigger_event IS NULL OR (trigger_event = ANY (ARRAY[
        'end_of_conversation'::text,
        'after_call'::text,
        'after_booking'::text,
        'interaction_threshold'::text,
        'manual_refresh'::text
      ])));


  END IF;


END $$;



-- Update summary_type constraint to include chat_summary
DO $$
BEGIN
  ALTER TABLE ai_summaries DROP CONSTRAINT IF EXISTS ai_summaries_summary_type_check;


  ALTER TABLE ai_summaries ADD CONSTRAINT ai_summaries_summary_type_check
    CHECK (summary_type IS NULL OR (summary_type = ANY (ARRAY[
      'call_transcription'::text,
      'move_summary'::text,
      'chat_summary'::text,
      'conversation_summary'::text
    ])));


END $$;



-- Add index for latest summary queries
CREATE INDEX IF NOT EXISTS idx_ai_summaries_customer_generated ON ai_summaries(customer_id, generated_at DESC);



-- Add index on call_logs for customer call history
CREATE INDEX IF NOT EXISTS idx_call_logs_customer_id ON call_logs(customer_id);



-- Add action_items and follow_ups columns to call_logs if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'call_logs' AND column_name = 'action_items'
  ) THEN
    ALTER TABLE call_logs ADD COLUMN action_items text[];


  END IF;



  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'call_logs' AND column_name = 'follow_ups_needed'
  ) THEN
    ALTER TABLE call_logs ADD COLUMN follow_ups_needed text[];


  END IF;


END $$;



-- Add unique index on vapi_call_id for webhook deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_call_logs_vapi_call_id ON call_logs(vapi_call_id) WHERE vapi_call_id IS NOT NULL;



-- Add index on customers.phone for quick lookup by phone number
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone) WHERE phone IS NOT NULL AND phone != '';



-- Add index on customers.email for quick lookup
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
