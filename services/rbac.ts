import { supabase } from './supabase';

export type UserRole = 'master_admin' | 'admin' | 'family_partner' | 'customer';

export interface RoleInfo {
  role: UserRole;
  permissions: string[];
}

export async function requireRole(userId: string, role: UserRole): Promise<void> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', role)
    .single();

  if (error || !data) {
    throw new Error('Access denied');
  }
}

export async function requirePermission(userId: string, permission: string): Promise<void> {
  const { data, error } = await supabase.rpc('user_has_permission', {
    user_uuid: userId,
    permission_name: permission,
  });

  if (error || !data) {
    throw new Error('Access denied');
  }
}

export async function getUserRole(userId: string): Promise<UserRole | null> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.role as UserRole;
}

export async function getUserPermissions(userId: string): Promise<string[]> {
  const role = await getUserRole(userId);

  if (!role) {
    return [];
  }

  const { data, error } = await supabase
    .from('role_permissions')
    .select('permission')
    .eq('role', role);

  if (error || !data) {
    return [];
  }

  return data.map((row) => row.permission);
}

export async function isAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('user_is_admin', {
    user_uuid: userId,
  });

  if (error) {
    return false;
  }

  return data === true;
}

export async function isMasterAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === 'master_admin';
}

export async function assignRole(userId: string, role: UserRole): Promise<boolean> {
  const { error } = await supabase
    .from('user_roles')
    .upsert({
      user_id: userId,
      role,
      updated_at: new Date().toISOString(),
    });

  return !error;
}
