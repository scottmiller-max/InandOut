import { useState, useEffect } from 'react';
import { authService, User } from '@/services/auth';
import { supabase } from '@/services/supabase';
import { roleService, UserRole } from '@/services/roles';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);

  const loadUserRole = async (userId: string) => {
    const role = await roleService.getUserRole(userId);
    setUserRole(role);
    return role;
  };

  const buildUserData = (authUser: { id: string; email?: string | null; user_metadata?: Record<string, string>; created_at?: string }): User => ({
    id: authUser.id,
    email: authUser.email || '',
    firstName: authUser.user_metadata?.firstName || '',
    lastName: authUser.user_metadata?.lastName || '',
    phone: authUser.user_metadata?.phone || '',
    createdAt: authUser.created_at || '',
  });

  useEffect(() => {
    checkAuthState();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          const userData = buildUserData(session.user);
          setUser(userData);
          (async () => {
            await loadUserRole(session.user.id);
          })();
        } else {
          setUser(null);
          setUserRole(null);
        }
        setLoading(false);
        setInitializing(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const checkAuthState = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (!error && session?.user) {
        const userData = buildUserData(session.user);
        setUser(userData);
        await loadUserRole(session.user.id);
      } else {
        setUser(null);
        setUserRole(null);
      }
    } catch (error) {
      setUser(null);
      setUserRole(null);
    } finally {
      setLoading(false);
      setInitializing(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { user: authUser } = await authService.signIn(email, password);
      if (authUser) {
        const userData = buildUserData(authUser);
        setUser(userData);
        await loadUserRole(authUser.id);
      }
      return true;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string, phone: string) => {
    try {
      setLoading(true);
      const { user: authUser } = await authService.signUp(email, password, firstName, lastName, phone);
      if (authUser) {
        const userData: User = {
          id: authUser.id,
          email: authUser.email || '',
          firstName,
          lastName,
          phone,
          createdAt: authUser.created_at || '',
        };
        setUser(userData);
        await loadUserRole(authUser.id);
      }
      return true;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await authService.signOut();
      setUser(null);
      setUserRole(null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = userRole === 'admin' || userRole === 'master_admin';
  const isStaff = isAdmin || userRole === 'dispatcher' || userRole === 'crew' || userRole === 'family_partner';

  return {
    user,
    userRole,
    loading,
    initializing,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user,
    isAdmin,
    isStaff,
  };
};