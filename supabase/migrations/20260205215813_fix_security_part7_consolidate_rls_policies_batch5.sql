/*
  # Security Fixes Part 7: Consolidate Overlapping RLS Policies (Batch 5 - Final)

  ## Changes Made
  
  ### Policy Consolidation
  Consolidates overlapping permissive policies for:
  - role_permissions
  - staff_profiles
  - user_notification_preferences
  - user_roles
  - users
  
  ## Security Impact
  - Clearer security boundaries
  - Improved query performance
  - Easier maintenance
  - Complete RLS policy consolidation
*/

-- ============================================================================
-- ROLE_PERMISSIONS: Consolidate SELECT policies
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can read permissions" ON role_permissions;


DROP POLICY IF EXISTS "Service role can manage permissions" ON role_permissions;



CREATE POLICY "Authenticated users can read permissions"
  ON role_permissions
  FOR SELECT
  TO authenticated
  USING (true);



-- ============================================================================
-- STAFF_PROFILES: Consolidate all policies
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage staff profiles" ON staff_profiles;


DROP POLICY IF EXISTS "Service role can manage staff profiles" ON staff_profiles;


DROP POLICY IF EXISTS "Admins and dispatchers can read all staff profiles" ON staff_profiles;


DROP POLICY IF EXISTS "Staff can read own profile" ON staff_profiles;



CREATE POLICY "Staff can read profiles"
  ON staff_profiles
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'dispatcher', 'master_admin')
    )
  );



CREATE POLICY "Admins can manage staff profiles"
  ON staff_profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'master_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'master_admin')
    )
  );



-- ============================================================================
-- USER_NOTIFICATION_PREFERENCES: Consolidate SELECT policies
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all preferences" ON user_notification_preferences;


DROP POLICY IF EXISTS "Users can view own preferences" ON user_notification_preferences;



CREATE POLICY "Users can view preferences"
  ON user_notification_preferences
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'master_admin')
    )
  );



-- ============================================================================
-- USER_ROLES: Consolidate INSERT policies
-- ============================================================================

DROP POLICY IF EXISTS "Master admins can manage roles" ON user_roles;


DROP POLICY IF EXISTS "Users can insert own customer role" ON user_roles;


DROP POLICY IF EXISTS "Users can insert own role" ON user_roles;



CREATE POLICY "Users can insert roles"
  ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (user_id = auth.uid() AND role = 'customer')
    OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'master_admin'
    )
  );



-- USER_ROLES: Consolidate SELECT policies
DROP POLICY IF EXISTS "Admins and dispatchers can read all roles" ON user_roles;


DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;


DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;



CREATE POLICY "Users can view roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'dispatcher', 'master_admin')
    )
  );



-- ============================================================================
-- USERS: Consolidate INSERT policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert own data" ON users;


DROP POLICY IF EXISTS "Users can insert own profile" ON users;



CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());



-- USERS: Consolidate SELECT policies
DROP POLICY IF EXISTS "Admins can view all users" ON users;


DROP POLICY IF EXISTS "Users can read own data" ON users;



CREATE POLICY "Users can read profiles"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'dispatcher', 'master_admin')
    )
  );
