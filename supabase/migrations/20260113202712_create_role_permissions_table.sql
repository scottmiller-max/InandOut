/*
  # Create role_permissions table and add dispatcher role

  1. New Table
    - `role_permissions` - Maps roles to specific permissions

  2. Role Updates
    - Add 'dispatcher' and 'family_partner' to valid roles
    - 'crew' already exists in the constraint

  3. Permissions
    - Define all permissions for existing and new roles
    - Dispatcher: Full operational access
    - Crew: Field staff limited access
    - System: Riley AI capabilities

  4. Security
    - Enable RLS on role_permissions
    - All authenticated users can read permissions
    - Only master_admin can modify permissions
*/

-- Create role_permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  permission text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role, permission)
);

-- Create index for faster permission lookups
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);

-- Enable RLS
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for role_permissions

-- All authenticated users can read permissions
CREATE POLICY "Authenticated users can read permissions"
  ON role_permissions
  FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can modify (edge functions use service role)
CREATE POLICY "Service role can manage permissions"
  ON role_permissions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Drop the existing constraint on user_roles
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS valid_role;

-- Add new constraint with all roles including dispatcher and family_partner
ALTER TABLE user_roles ADD CONSTRAINT valid_role 
  CHECK (role IN ('master_admin', 'admin', 'dispatcher', 'family_partner', 'crew', 'customer'));

-- Insert default role permissions
INSERT INTO role_permissions (role, permission) VALUES
  -- Master Admin: Full access
  ('master_admin', 'admin:access'),
  ('master_admin', 'admin:dashboard'),
  ('master_admin', 'crm:read'),
  ('master_admin', 'crm:write'),
  ('master_admin', 'crm:delete'),
  ('master_admin', 'users:manage'),
  ('master_admin', 'roles:manage'),
  ('master_admin', 'settings:manage'),
  ('master_admin', 'analytics:read'),
  ('master_admin', 'jobs:read'),
  ('master_admin', 'jobs:create'),
  ('master_admin', 'jobs:edit'),
  ('master_admin', 'jobs:delete'),
  ('master_admin', 'jobs:assign'),
  ('master_admin', 'jobs:approve_draft'),
  ('master_admin', 'messages:send_sms'),
  ('master_admin', 'messages:send_email'),
  ('master_admin', 'messages:read_all'),
  ('master_admin', 'interactions:read_all'),
  ('master_admin', 'interactions:create'),
  ('master_admin', 'ai_summaries:read'),
  ('master_admin', 'contacts:read'),
  ('master_admin', 'contacts:promote'),
  ('master_admin', 'contacts:delete'),
  
  -- Admin: Most access except user/role management
  ('admin', 'admin:access'),
  ('admin', 'admin:dashboard'),
  ('admin', 'crm:read'),
  ('admin', 'crm:write'),
  ('admin', 'settings:read'),
  ('admin', 'analytics:read'),
  ('admin', 'jobs:read'),
  ('admin', 'jobs:create'),
  ('admin', 'jobs:edit'),
  ('admin', 'jobs:assign'),
  ('admin', 'jobs:approve_draft'),
  ('admin', 'messages:send_sms'),
  ('admin', 'messages:send_email'),
  ('admin', 'messages:read_all'),
  ('admin', 'interactions:read_all'),
  ('admin', 'interactions:create'),
  ('admin', 'ai_summaries:read'),
  ('admin', 'contacts:read'),
  ('admin', 'contacts:promote'),
  
  -- Dispatcher: Operations Management (can delete contacts)
  ('dispatcher', 'crm:read'),
  ('dispatcher', 'crm:write'),
  ('dispatcher', 'crm:assign_staff'),
  ('dispatcher', 'customers:view_all'),
  ('dispatcher', 'customers:edit'),
  ('dispatcher', 'contacts:read'),
  ('dispatcher', 'contacts:promote'),
  ('dispatcher', 'contacts:delete'),
  ('dispatcher', 'jobs:read'),
  ('dispatcher', 'jobs:create'),
  ('dispatcher', 'jobs:edit'),
  ('dispatcher', 'jobs:assign'),
  ('dispatcher', 'jobs:approve_draft'),
  ('dispatcher', 'messages:send_sms'),
  ('dispatcher', 'messages:send_email'),
  ('dispatcher', 'messages:read_all'),
  ('dispatcher', 'interactions:read_all'),
  ('dispatcher', 'interactions:create'),
  ('dispatcher', 'ai_summaries:read'),
  ('dispatcher', 'analytics:read'),
  
  -- Family Partner: Limited CRM access
  ('family_partner', 'crm:read'),
  ('family_partner', 'jobs:assign'),
  ('family_partner', 'jobs:read'),
  
  -- Crew: Field Operations (can message customers)
  ('crew', 'jobs:view_assigned'),
  ('crew', 'jobs:update_status'),
  ('crew', 'customers:view_assigned'),
  ('crew', 'messages:send_sms'),
  ('crew', 'messages:send_email'),
  ('crew', 'messages:read_assigned'),
  ('crew', 'interactions:create_assigned'),
  ('crew', 'photos:upload'),
  ('crew', 'documents:upload'),
  
  -- Customer: Basic access
  ('customer', 'profile:read'),
  ('customer', 'profile:write'),
  ('customer', 'jobs:view_own'),
  ('customer', 'messages:own'),
  
  -- System/Riley: AI operations (for documentation)
  ('system', 'jobs:create_draft'),
  ('system', 'interactions:create'),
  ('system', 'ai_summaries:create'),
  ('system', 'customers:read')
ON CONFLICT (role, permission) DO NOTHING;

-- Create function to get role hierarchy level
CREATE OR REPLACE FUNCTION get_role_hierarchy_level(user_role text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN CASE user_role
    WHEN 'master_admin' THEN 5
    WHEN 'admin' THEN 4
    WHEN 'dispatcher' THEN 3
    WHEN 'family_partner' THEN 2
    WHEN 'crew' THEN 2
    WHEN 'customer' THEN 1
    ELSE 0
  END;
END;
$$;

-- Create function to check if user can manage another user's role
CREATE OR REPLACE FUNCTION can_manage_role(manager_user_id uuid, target_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  manager_role text;
  manager_level integer;
  target_level integer;
BEGIN
  -- Get manager's highest role
  SELECT role INTO manager_role
  FROM user_roles
  WHERE user_id = manager_user_id
  LIMIT 1;

  IF manager_role IS NULL THEN
    RETURN false;
  END IF;

  manager_level := get_role_hierarchy_level(manager_role);
  target_level := get_role_hierarchy_level(target_role);

  -- Master admin can manage all, others can only manage roles below their level
  IF manager_role = 'master_admin' THEN
    RETURN true;
  END IF;

  RETURN manager_level > target_level;
END;
$$;

-- Create function to check if user has specific role
CREATE OR REPLACE FUNCTION user_has_role(user_uuid uuid, role_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_roles ur
    WHERE ur.user_id = user_uuid
    AND ur.role = role_name
  );
END;
$$;

-- Update RLS policies to include dispatcher
DROP POLICY IF EXISTS "Admins can read all roles" ON user_roles;
CREATE POLICY "Admins and dispatchers can read all roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('master_admin', 'admin', 'dispatcher')
    )
  );

-- Add comment explaining the permission system
COMMENT ON TABLE role_permissions IS 'Maps roles to specific permissions. Permissions follow the pattern resource:action (e.g., crm:read, jobs:assign). Edge functions check these permissions before allowing operations. System role is for Riley AI and not assigned to users.';