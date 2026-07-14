/*
  # Fix Admin Role Assignment and Create Missing RPC Functions

  1. Data Fixes
    - Assign `master_admin` role to scottmiller@inandoutmovin.com
    - Update profile (first_name, last_name) for scottmiller@inandoutmovin.com

  2. Trigger Fix
    - Update `handle_new_user_role()` to check for `scottmiller@inandoutmovin.com`
      instead of `inandoutmovin@gmail.com`

  3. New Functions
    - `user_is_admin(user_uuid)` - Returns true if user has admin or master_admin role
    - `user_has_permission(user_uuid, permission_name)` - Checks role_permissions table

  4. Security
    - Both functions use SECURITY DEFINER to bypass RLS for internal checks
    - Functions are granted to authenticated role only
*/

-- 1. Assign master_admin role to scottmiller@inandoutmovin.com
DO $$
DECLARE
  target_user_id uuid;


BEGIN
  SELECT id INTO target_user_id
  FROM public.users
  WHERE email = 'scottmiller@inandoutmovin.com';



  IF target_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role, created_at, updated_at)
    VALUES (target_user_id, 'master_admin', NOW(), NOW())
    ON CONFLICT (user_id, role) DO NOTHING;



    UPDATE public.users
    SET first_name = 'Scott', last_name = 'Miller'
    WHERE id = target_user_id AND (first_name = '' OR first_name IS NULL);


  END IF;


END $$;



-- 2. Replace the trigger function to check correct email
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'scottmiller@inandoutmovin.com' THEN
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



-- 3. Create user_is_admin RPC function
CREATE OR REPLACE FUNCTION public.user_is_admin(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = user_uuid
    AND role IN ('admin', 'master_admin')
  );


END;


$$;



GRANT EXECUTE ON FUNCTION public.user_is_admin(uuid) TO authenticated;



-- 4. Create user_has_permission RPC function
CREATE OR REPLACE FUNCTION public.user_has_permission(user_uuid uuid, permission_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    WHERE ur.user_id = user_uuid
    AND rp.permission = permission_name
  );


END;


$$;



GRANT EXECUTE ON FUNCTION public.user_has_permission(uuid, text) TO authenticated;
