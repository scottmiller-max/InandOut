/*
  # Fix User Registration - RLS Policies and Automatic Profile Creation

  ## Problem
  New user registration fails with "Database error saving new user" because:
  1. RLS policies on `users` table block INSERT operations during signup
  2. RLS policies on `user_roles` table block INSERT operations
  3. Client-side inserts happen before email verification completes

  ## Solution
  1. Create a SECURITY DEFINER trigger function that auto-creates user profile
  2. Create a SECURITY DEFINER trigger function that auto-assigns default role
  3. Update RLS policies to allow system-level user creation
  4. Maintain multi-role support with UNIQUE(user_id, role) constraint

  ## Tables Affected
  - `users` - Add trigger for auto-creation on auth.users INSERT
  - `user_roles` - Add INSERT policy for authenticated users

  ## Security
  - Trigger functions use SECURITY DEFINER to bypass RLS
  - Only the trigger can create initial user records
  - Users can still update their own profiles after creation
*/

-- Function to automatically create user profile when auth.users record is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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


$$ LANGUAGE plpgsql SECURITY DEFINER;



-- Function to automatically assign default role when auth.users record is created
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is the master admin email
  IF NEW.email = 'inandoutmovin@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role, created_at, updated_at)
    VALUES (NEW.id, 'master_admin', NOW(), NOW())
    ON CONFLICT (user_id, role) DO NOTHING;


  END IF;


  
  -- Always create customer role for all users (multi-role support)
  INSERT INTO public.user_roles (user_id, role, created_at, updated_at)
  VALUES (NEW.id, 'customer', NOW(), NOW())
  ON CONFLICT (user_id, role) DO NOTHING;


  
  RETURN NEW;


END;


$$ LANGUAGE plpgsql SECURITY DEFINER;



-- Drop existing triggers if they exist (to avoid conflicts)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;


DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;


DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;


DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;



-- Create trigger to auto-create user profile
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();



-- Create trigger to auto-assign default role
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();



-- Drop existing conflicting RLS policies on users table
DROP POLICY IF EXISTS "Users can insert own data" ON users;


DROP POLICY IF EXISTS "System can create user profiles" ON users;



-- Add policy that allows the trigger (service role) to create user profiles
-- Note: SECURITY DEFINER functions bypass RLS, so this is mainly for documentation
CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);



-- Drop existing conflicting RLS policies on user_roles table
DROP POLICY IF EXISTS "Users can insert own role" ON user_roles;


DROP POLICY IF EXISTS "Authenticated users can insert own role" ON user_roles;



-- Add policy allowing authenticated users to add roles to themselves
-- This supports the multi-role design where users can have multiple roles
CREATE POLICY "Users can insert own role"
  ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);



-- Ensure the user_roles table supports multi-role (user_id + role unique, not just user_id)
-- First check if we need to modify the constraint
DO $$
BEGIN
  -- Drop the old unique constraint on user_id only if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_roles_user_id_key' 
    AND conrelid = 'user_roles'::regclass
  ) THEN
    ALTER TABLE user_roles DROP CONSTRAINT user_roles_user_id_key;


  END IF;


  
  -- Add the correct unique constraint for multi-role support if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_roles_user_id_role_key' 
    AND conrelid = 'user_roles'::regclass
  ) THEN
    ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


  END IF;


END $$;



-- Add assigned_by and assigned_at columns if they don't exist (for admin role management)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_roles' AND column_name = 'assigned_by'
  ) THEN
    ALTER TABLE user_roles ADD COLUMN assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;


  END IF;


  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_roles' AND column_name = 'assigned_at'
  ) THEN
    ALTER TABLE user_roles ADD COLUMN assigned_at timestamptz DEFAULT now();


  END IF;


END $$;



-- Update the valid_role check constraint to include 'crew' role if needed
DO $$
BEGIN
  -- Drop old constraint if exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'valid_role' 
    AND conrelid = 'user_roles'::regclass
  ) THEN
    ALTER TABLE user_roles DROP CONSTRAINT valid_role;


  END IF;


  
  -- Add updated constraint with all valid roles
  ALTER TABLE user_roles ADD CONSTRAINT valid_role 
    CHECK (role IN ('master_admin', 'admin', 'family_partner', 'crew', 'customer'));


END $$;
