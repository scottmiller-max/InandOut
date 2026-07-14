/*
  # Security Fixes Part 1: Remove Unused Indexes

  ## Changes Made
  
  ### Unused Indexes Removal
  Removes 46 unused indexes that:
  - Slow down INSERT/UPDATE operations
  - Waste storage space
  - Provide no query performance benefit
  
  ## Performance Impact
  - Faster writes to affected tables
  - Reduced storage usage
  - No impact on query performance (indexes weren't being used)
*/

-- ============================================================================
-- DROP UNUSED INDEXES
-- ============================================================================

-- Contact Submissions
DROP INDEX IF EXISTS idx_contact_submissions_responded_by;


DROP INDEX IF EXISTS idx_contact_submissions_customer_id;



-- Customer Photos
DROP INDEX IF EXISTS idx_customer_photos_customer_id_fk;


DROP INDEX IF EXISTS idx_customer_photos_job_id_fk;


DROP INDEX IF EXISTS idx_customer_photos_user_id_fk;


DROP INDEX IF EXISTS idx_customer_photos_move_id;



-- Customers
DROP INDEX IF EXISTS idx_customers_user_id_fk;



-- Draft Jobs
DROP INDEX IF EXISTS idx_draft_jobs_converted_job_id_fk;


DROP INDEX IF EXISTS idx_draft_jobs_reviewed_by_fk;


DROP INDEX IF EXISTS idx_draft_jobs_customer_id;



-- Email Throttle Log
DROP INDEX IF EXISTS idx_email_throttle_log_job_id_fk;



-- Events
DROP INDEX IF EXISTS idx_events_job_id_fk;


DROP INDEX IF EXISTS idx_events_move_id_fk;


DROP INDEX IF EXISTS idx_events_created_by;



-- Job Notifications
DROP INDEX IF EXISTS idx_job_notifications_user_id_fk;


DROP INDEX IF EXISTS idx_job_notifications_job_id;



-- Jobs
DROP INDEX IF EXISTS idx_jobs_customer_id_fk;



-- Messages
DROP INDEX IF EXISTS idx_messages_job_id_fk;


DROP INDEX IF EXISTS idx_messages_move_id_fk;


DROP INDEX IF EXISTS idx_messages_sender_id_fk;



-- Moves
DROP INDEX IF EXISTS idx_moves_job_id_fk;


DROP INDEX IF EXISTS idx_moves_user_id_fk;



-- Project Files
DROP INDEX IF EXISTS idx_project_files_user_id_fk;



-- Documents Registry
DROP INDEX IF EXISTS idx_documents_registry_visibility_active;


DROP INDEX IF EXISTS idx_documents_registry_document_type;


DROP INDEX IF EXISTS idx_documents_registry_created_by;


DROP INDEX IF EXISTS idx_documents_registry_effective_date;



-- Document Acknowledgements
DROP INDEX IF EXISTS idx_document_acks_document_id;


DROP INDEX IF EXISTS idx_document_acks_user_id;


DROP INDEX IF EXISTS idx_document_acks_acknowledged_at;



-- Staff Profiles
DROP INDEX IF EXISTS idx_staff_profiles_role;



-- AI Summaries
DROP INDEX IF EXISTS idx_ai_summaries_mentioned_policies;


DROP INDEX IF EXISTS idx_ai_summaries_call_log_id;


DROP INDEX IF EXISTS idx_ai_summaries_customer_id;


DROP INDEX IF EXISTS idx_ai_summaries_job_id;



-- Interactions
DROP INDEX IF EXISTS idx_interactions_policy_references;


DROP INDEX IF EXISTS idx_interactions_contact_submission_id;


DROP INDEX IF EXISTS idx_interactions_created_by;


DROP INDEX IF EXISTS idx_interactions_customer_id;



-- Audit Log
DROP INDEX IF EXISTS idx_audit_log_actor_id;


DROP INDEX IF EXISTS idx_audit_log_action;



-- Call Logs
DROP INDEX IF EXISTS idx_call_logs_customer_id;



-- User Roles
DROP INDEX IF EXISTS idx_user_roles_assigned_by;



-- Rate Limits
DROP INDEX IF EXISTS rate_limits_window_start_idx;


DROP INDEX IF EXISTS rate_limits_blocked_until_idx;
