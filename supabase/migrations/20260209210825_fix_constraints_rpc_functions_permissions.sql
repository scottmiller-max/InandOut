/*
  # Fix Constraints, RPC Functions, and Permissions for v0 Admin Integration

  1. Constraint Fixes
    - Drop the narrow `user_roles_role_check` constraint that blocks `dispatcher` and `family_partner`
    - Recreate unified constraint allowing: master_admin, admin, dispatcher, family_partner, crew, customer

  2. Functions Updated
    - `get_staff_context()` - Dropped and recreated with new return type including `is_staff` boolean
      Resolves role priority: JWT app_metadata > user_roles (highest level) > staff_profiles
    - `has_permission(text)` - New helper using auth.uid() internally for RLS policy use

  3. Permissions Added (role_permissions)
    - submissions:read, submissions:write for master_admin, admin, dispatcher
    - moves:read, moves:write for master_admin, admin, dispatcher
    - docs:read, docs:write, docs:ack for master_admin, admin;

 docs:read, docs:ack for dispatcher
    - audit:read for master_admin only
    - calls:read for master_admin, admin, dispatcher
    - payments:read for master_admin, admin

  4. Important Notes
    - get_staff_context() returns: auth_uid, role, permissions[], staff_profile_id, is_staff
    - For multi-role users, picks the highest hierarchy level from user_roles
    - has_permission() is STABLE SECURITY DEFINER for safe use in RLS policies
*/

-- Step 1: Fix CHECK constraints on user_roles
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;


ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS valid_role;



ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check
  CHECK (role = ANY (ARRAY[
    'master_admin'::text,
    'admin'::text,
    'dispatcher'::text,
    'family_partner'::text,
    'crew'::text,
    'customer'::text
  ]));



-- Step 2: Drop old get_staff_context and recreate with new signature
DROP FUNCTION IF EXISTS public.get_staff_context();



CREATE FUNCTION public.get_staff_context()
RETURNS TABLE(
  auth_uid uuid,
  role text,
  permissions text[],
  staff_profile_id uuid,
  is_staff boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  WITH caller AS (
    SELECT auth.uid() AS uid
  ),
  jwt_role AS (
    SELECT nullif(trim(auth.jwt() -> 'app_metadata' ->> 'role'), '') AS r
  ),
  db_roles AS (
    SELECT ur.role AS r
    FROM public.user_roles ur, caller c
    WHERE ur.user_id = c.uid
    ORDER BY public.get_role_hierarchy_level(ur.role) DESC
    LIMIT 1
  ),
  sp_role AS (
    SELECT sp.role AS r
    FROM public.staff_profiles sp, caller c
    WHERE sp.user_id = c.uid
    LIMIT 1
  ),
  resolved AS (
    SELECT coalesce(
      (SELECT r FROM jwt_role WHERE r IS NOT NULL),
      (SELECT r FROM db_roles),
      (SELECT r FROM sp_role)
    ) AS final_role
  ),
  sp_info AS (
    SELECT s.id AS profile_id
    FROM public.staff_profiles s, caller c
    WHERE s.user_id = c.uid
    LIMIT 1
  )
  SELECT
    c.uid                                AS auth_uid,
    coalesce(r.final_role, 'none')       AS role,
    coalesce(
      array_agg(DISTINCT rp.permission) FILTER (WHERE rp.permission IS NOT NULL),
      ARRAY[]::text[]
    )                                    AS permissions,
    sp.profile_id                        AS staff_profile_id,
    coalesce(r.final_role, 'none') = ANY(ARRAY['master_admin','admin','dispatcher']) AS is_staff
  FROM caller c
  CROSS JOIN resolved r
  LEFT JOIN public.role_permissions rp ON rp.role = r.final_role
  LEFT JOIN sp_info sp ON true
  GROUP BY c.uid, r.final_role, sp.profile_id;


$$;



-- Step 3: Create has_permission() helper for RLS policies
CREATE OR REPLACE FUNCTION public.has_permission(permission_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = auth.uid()
      AND rp.permission = permission_name
  );


$$;



-- Step 4: Add missing role_permissions entries
INSERT INTO public.role_permissions (role, permission) VALUES
  ('master_admin', 'submissions:read'),
  ('master_admin', 'submissions:write'),
  ('admin', 'submissions:read'),
  ('admin', 'submissions:write'),
  ('dispatcher', 'submissions:read'),
  ('dispatcher', 'submissions:write'),
  ('master_admin', 'moves:read'),
  ('master_admin', 'moves:write'),
  ('admin', 'moves:read'),
  ('admin', 'moves:write'),
  ('dispatcher', 'moves:read'),
  ('dispatcher', 'moves:write'),
  ('master_admin', 'docs:read'),
  ('master_admin', 'docs:write'),
  ('master_admin', 'docs:ack'),
  ('admin', 'docs:read'),
  ('admin', 'docs:write'),
  ('admin', 'docs:ack'),
  ('dispatcher', 'docs:read'),
  ('dispatcher', 'docs:ack'),
  ('master_admin', 'audit:read'),
  ('master_admin', 'calls:read'),
  ('admin', 'calls:read'),
  ('dispatcher', 'calls:read'),
  ('master_admin', 'payments:read'),
  ('admin', 'payments:read')
ON CONFLICT DO NOTHING;
