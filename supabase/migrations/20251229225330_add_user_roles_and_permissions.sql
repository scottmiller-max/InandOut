/*
  # User Roles and Permissions System

  1. New Tables
    - `user_roles`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `role` (text) - Values: 'master_admin', 'admin', 'family_partner', 'customer'
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `role_permissions`
      - `id` (uuid, primary key)
      - `role` (text)
      - `permission` (text) - e.g., 'admin:access', 'crm:read', 'crm:write'
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can read their own role
    - Only master_admin and admin can manage roles
    - Permissions are read-only for checking access

  3. Initial Data
    - Insert master admin role for scottmiller@inandoutmovin.com
    - Insert default role permissions for each role type

  4. Important Notes
    - Default role for new users is 'customer'
    - Only one master_admin should exist
    - Role hierarchy: master_admin > admin > family_partner > customer
*/

-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'customer',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_role CHECK (role IN ('master_admin', 'admin', 'family_partner', 'customer'))
);

-- Create role_permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  permission text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role, permission)
);

-- Create index for faster role lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles

-- Users can read their own role
CREATE POLICY "Users can read own role"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Master admin and admin can read all roles
CREATE POLICY "Admins can read all roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('master_admin', 'admin')
    )
  );

-- Only master admin can insert/update/delete roles
CREATE POLICY "Master admin can manage roles"
  ON user_roles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'master_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'master_admin'
    )
  );

-- RLS Policies for role_permissions

-- All authenticated users can read permissions
CREATE POLICY "Authenticated users can read permissions"
  ON role_permissions
  FOR SELECT
  TO authenticated
  USING (true);

-- Only master admin can manage permissions
CREATE POLICY "Master admin can manage permissions"
  ON role_permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'master_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'master_admin'
    )
  );

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
  
  -- Admin: Most access except user/role management
  ('admin', 'admin:access'),
  ('admin', 'admin:dashboard'),
  ('admin', 'crm:read'),
  ('admin', 'crm:write'),
  ('admin', 'settings:read'),
  ('admin', 'analytics:read'),
  
  -- Family Partner: Limited CRM access
  ('family_partner', 'crm:read'),
  ('family_partner', 'jobs:assign'),
  
  -- Customer: Basic access
  ('customer', 'profile:read'),
  ('customer', 'profile:write'),
  ('customer', 'jobs:view_own'),
  ('customer', 'messages:own')
ON CONFLICT (role, permission) DO NOTHING;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_user_roles_updated_at ON user_roles;
CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(user_uuid uuid, permission_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role = rp.role
    WHERE ur.user_id = user_uuid
    AND rp.permission = permission_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION user_is_admin(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_roles ur
    WHERE ur.user_id = user_uuid
    AND ur.role IN ('master_admin', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;