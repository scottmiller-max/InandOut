/*
  # Fix Security and Performance Issues - Part 1: Indexes and Cleanup

  1. Performance Improvements
    - Add missing indexes on foreign keys:
      - customer_photos.move_id
      - events.created_by
      - user_roles.assigned_by
    - Remove unused indexes to reduce overhead

  2. Notes
    - This is part 1 of the security fix
    - Part 2 will fix RLS policies
    - Unused indexes add maintenance overhead without providing query benefits
*/

-- =====================================================
-- STEP 1: Add missing indexes on foreign keys
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_customer_photos_move_id 
  ON public.customer_photos(move_id);



CREATE INDEX IF NOT EXISTS idx_events_created_by 
  ON public.events(created_by);



CREATE INDEX IF NOT EXISTS idx_user_roles_assigned_by 
  ON public.user_roles(assigned_by);



-- =====================================================
-- STEP 2: Remove unused indexes
-- =====================================================

DROP INDEX IF EXISTS public.idx_project_settings_user_id;


DROP INDEX IF EXISTS public.idx_project_files_user_id;


DROP INDEX IF EXISTS public.idx_project_files_category;


DROP INDEX IF EXISTS public.idx_user_roles_user_id;


DROP INDEX IF EXISTS public.idx_user_roles_role;


DROP INDEX IF EXISTS public.idx_customers_user_id;


DROP INDEX IF EXISTS public.idx_customers_email;


DROP INDEX IF EXISTS public.idx_jobs_customer_id;


DROP INDEX IF EXISTS public.idx_jobs_status;


DROP INDEX IF EXISTS public.idx_jobs_move_date;


DROP INDEX IF EXISTS public.idx_jobs_job_number;


DROP INDEX IF EXISTS public.idx_moves_user_id;


DROP INDEX IF EXISTS public.idx_moves_job_id;


DROP INDEX IF EXISTS public.idx_moves_status;


DROP INDEX IF EXISTS public.idx_messages_job_id;


DROP INDEX IF EXISTS public.idx_messages_move_id;


DROP INDEX IF EXISTS public.idx_messages_sender_id;


DROP INDEX IF EXISTS public.idx_events_job_id;


DROP INDEX IF EXISTS public.idx_events_move_id;


DROP INDEX IF EXISTS public.idx_events_event_time;


DROP INDEX IF EXISTS public.idx_customer_photos_customer_id;


DROP INDEX IF EXISTS public.idx_customer_photos_user_id;


DROP INDEX IF EXISTS public.idx_customer_photos_job_id;


DROP INDEX IF EXISTS public.idx_document_templates_type;


DROP INDEX IF EXISTS public.idx_document_templates_active;


DROP INDEX IF EXISTS public.idx_users_email;


DROP INDEX IF EXISTS public.idx_users_id;
