/*
  # Fix User Creation Trigger Functions

  ## Problem
  Migration 20260106232002 accidentally overwrote two critical trigger functions:
  1. `handle_new_user()` was reduced to only insert id/email/created_at, losing
     first_name, last_name, and phone extraction from user metadata
  2. `handle_new_user_role()` was changed to use `NEW.user_id` which does NOT exist
     on the `auth.users` table (the correct column is `NEW.id`), causing a runtime
     error that produces "Database error saving new user"

  ## Fix
  - Restore `handle_new_user()` to extract first_name, last_name, phone from
    `raw_user_meta_data`
  - Fix `handle_new_user_role()` to use `NEW.id` instead of `NEW.user_id`
  - Restore master_admin auto-assignment logic for designated email
  - Keep SECURITY DEFINER and search_path settings from the security migration

  ## Functions Updated
  - `handle_new_user` - restores metadata extraction
  - `handle_new_user_role` - fixes column reference and restores master admin logic
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    phone,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'firstName', ''),
    COALESCE(NEW.raw_user_meta_data->>'lastName', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    NOW(),
    NOW()
  )
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
  IF NEW.email = 'inandoutmovin@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role, created_at, updated_at)
    VALUES (NEW.id, 'master_admin', NOW(), NOW())
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  INSERT INTO public.user_roles (user_id, role, created_at, updated_at)
  VALUES (NEW.id, 'customer', NOW(), NOW())
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;