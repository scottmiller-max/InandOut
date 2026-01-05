/*
  # Auto-assign Master Admin Role

  1. Function
    - Creates a function that automatically assigns master_admin role to scottmiller@inandoutmovin.com
    - This function runs on user creation or when role is checked

  2. Trigger
    - Triggers on auth.users insert to automatically create the master_admin role
    - Only applies to the master admin email

  3. Manual Assignment
    - If the user already exists, manually assigns the role

  4. Important Notes
    - Only scottmiller@inandoutmovin.com gets master_admin role
    - All other users default to 'customer' role
    - This is a one-time setup for the master admin account
*/

-- Function to auto-assign master admin role
CREATE OR REPLACE FUNCTION assign_master_admin_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the new user is the master admin
  IF NEW.email = 'scottmiller@inandoutmovin.com' THEN
    -- Insert master_admin role
    INSERT INTO user_roles (user_id, role)
    VALUES (NEW.id, 'master_admin')
    ON CONFLICT (user_id) 
    DO UPDATE SET role = 'master_admin', updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_assign_master_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_master_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION assign_master_admin_role();

-- Manually assign master admin role if user already exists
-- This will handle the case where the user was created before this migration
DO $$
DECLARE
  master_user_id uuid;
BEGIN
  -- Find the user ID for the master admin email
  SELECT id INTO master_user_id
  FROM auth.users
  WHERE email = 'scottmiller@inandoutmovin.com'
  LIMIT 1;
  
  -- If user exists, assign master_admin role
  IF master_user_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role)
    VALUES (master_user_id, 'master_admin')
    ON CONFLICT (user_id)
    DO UPDATE SET role = 'master_admin', updated_at = now();
    
    RAISE NOTICE 'Master admin role assigned to existing user: %', master_user_id;
  ELSE
    RAISE NOTICE 'Master admin user not found. Role will be assigned automatically on first login.';
  END IF;
END $$;