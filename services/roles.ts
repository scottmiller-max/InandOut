import { supabase } from './supabase';

export type UserRole = 'master_admin' | 'admin' | 'dispatcher' | 'family_partner' | 'crew' | 'customer';

export interface UserRoleData {
  id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface RolePermission {
  id: string;
  role: UserRole;
  permission: string;
  created_at: string;
}

class RoleService {
  async getUserRole(userId: string): Promise<UserRole | null> {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }

      if (!data || data.length === 0) return null;

      if (data.length === 1) return data[0].role as UserRole;

      let highest: UserRole = data[0].role as UserRole;
      for (let i = 1; i < data.length; i++) {
        const role = data[i].role as UserRole;
        if (this.getRoleHierarchyLevel(role) > this.getRoleHierarchyLevel(highest)) {
          highest = role;
        }
      }
      return highest;
    } catch (error) {
      console.error('Error in getUserRole:', error);
      return null;
    }
  }

  async hasPermission(userId: string, permission: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('user_has_permission', {
        user_uuid: userId,
        permission_name: permission,
      });

      if (error) {
        console.error('Error checking permission:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Error in hasPermission:', error);
      return false;
    }
  }

  async isAdmin(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('user_is_admin', {
        user_uuid: userId,
      });

      if (error) {
        console.error('Error checking admin status:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Error in isAdmin:', error);
      return false;
    }
  }

  async isMasterAdmin(userId: string): Promise<boolean> {
    const role = await this.getUserRole(userId);
    return role === 'master_admin';
  }

  async createUserRole(userId: string, role: UserRole = 'customer'): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role,
        });

      if (error) {
        console.error('Error creating user role:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in createUserRole:', error);
      return false;
    }
  }

  async updateUserRole(userId: string, role: UserRole): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating user role:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateUserRole:', error);
      return false;
    }
  }

  async getAllPermissionsForRole(role: UserRole): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('permission')
        .eq('role', role);

      if (error) {
        console.error('Error fetching role permissions:', error);
        return [];
      }

      return data.map((p) => p.permission);
    } catch (error) {
      console.error('Error in getAllPermissionsForRole:', error);
      return [];
    }
  }

  getRoleHierarchyLevel(role: UserRole): number {
    const hierarchy: Record<UserRole, number> = {
      master_admin: 5,
      admin: 4,
      dispatcher: 3,
      family_partner: 2,
      crew: 2,
      customer: 1,
    };
    return hierarchy[role] || 0;
  }

  canManageRole(userRole: UserRole, targetRole: UserRole): boolean {
    const userLevel = this.getRoleHierarchyLevel(userRole);
    const targetLevel = this.getRoleHierarchyLevel(targetRole);

    if (userRole === 'master_admin') return true;

    return userLevel > targetLevel;
  }
}

export const roleService = new RoleService();
