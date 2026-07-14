/*
  # Sync app_metadata.role and Create Master Admin Staff Profile

  1. New Functions
    - `sync_app_metadata_role()` - Trigger function that updates auth.users.raw_app_meta_data.role
      whenever a user_roles row is inserted or updated, picking the highest-privilege role

  2. New Triggers
    - `trigger_sync_app_metadata_role` on user_roles AFTER INSERT OR UPDATE
      Calls sync_app_metadata_role() to keep JWT claims in sync with DB roles

  3. Data Changes
    - Backfill app_metadata.role for existing master_admin user
    - Create staff_profiles row for master_admin user if not exists

  4. Important Notes
    - The trigger uses auth.admin.updateUserById equivalent via raw SQL on auth.users
    - This ensures the JWT claim is always current after role changes
    - Staff profile is needed by get_staff_context() to return staff_profile_id
*/

-- Step 1: Create function to sync app_metadata.role to auth.users
CREATE OR REPLACE FUNCTION public.sync_app_metadata_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  highest_role text;


BEGIN
  SELECT ur.role INTO highest_role
  FROM public.user_roles ur
  WHERE ur.user_id = NEW.user_id
  ORDER BY public.get_role_hierarchy_level(ur.role) DESC
  LIMIT 1;



  IF highest_role IS NOT NULL THEN
    UPDATE auth.users
    SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', highest_role)
    WHERE id = NEW.user_id;


  END IF;



  RETURN NEW;


END;


$$;



-- Step 2: Create trigger on user_roles
DROP TRIGGER IF EXISTS trigger_sync_app_metadata_role ON public.user_roles;



CREATE TRIGGER trigger_sync_app_metadata_role
  AFTER INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_app_metadata_role();



-- Step 3: Backfill app_metadata.role for all existing users with staff roles
DO $$
DECLARE
  r RECORD;


BEGIN
  FOR r IN
    SELECT DISTINCT ON (ur.user_id) ur.user_id, ur.role
    FROM public.user_roles ur
    WHERE ur.role IN ('master_admin', 'admin', 'dispatcher')
    ORDER BY ur.user_id, public.get_role_hierarchy_level(ur.role) DESC
  LOOP
    UPDATE auth.users
    SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', r.role)
    WHERE id = r.user_id;


  END LOOP;


END;


$$;



-- Step 4: Create staff_profile for existing master_admin if not exists
INSERT INTO public.staff_profiles (user_id, position, department, employment_status, availability_status, role)
SELECT ur.user_id, 'Owner', 'Management', 'active', 'available', 'master_admin'
FROM public.user_roles ur
WHERE ur.role = 'master_admin'
  AND NOT EXISTS (
    SELECT 1 FROM public.staff_profiles sp WHERE sp.user_id = ur.user_id
  )
LIMIT 1;
