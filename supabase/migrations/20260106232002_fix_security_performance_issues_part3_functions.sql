/*
  # Fix Security and Performance Issues - Part 3: Function Security

  1. Function Security
    - Set explicit search_path for all functions to prevent search_path injection attacks
    - SECURITY DEFINER functions need search_path protection
    - Using `SET search_path = public, pg_temp` ensures functions only access expected schemas

  2. Functions Updated
    - handle_new_user
    - handle_new_user_role
    - update_updated_at_column
    - assign_master_admin_role
    - generate_job_number
*/

-- =====================================================
-- Fix function search paths
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at)
  VALUES (NEW.id, NEW.email, NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.user_id, 'customer')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_master_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'master_admin'
  ) THEN
    INSERT INTO public.user_roles (user_id, role, assigned_by)
    VALUES (NEW.id, 'master_admin', NEW.id)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_job_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  year_suffix TEXT;
  next_number INTEGER;
  new_job_number TEXT;
BEGIN
  year_suffix := TO_CHAR(CURRENT_DATE, 'YY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(job_number FROM 3) AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.jobs
  WHERE job_number LIKE year_suffix || '%';
  
  new_job_number := year_suffix || LPAD(next_number::TEXT, 4, '0');
  
  NEW.job_number := new_job_number;
  
  RETURN NEW;
END;
$$;