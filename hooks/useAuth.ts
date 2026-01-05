import { useState, useEffect } from 'react';
import { authService, User } from '@/services/auth';
import { supabase } from '@/services/supabase';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    checkAuthState();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const userData: User = {
            id: session.user.id,
            email: session.user.email || '',
            firstName: session.user.user_metadata?.firstName || '',
            lastName: session.user.user_metadata?.lastName || '',
            phone: session.user.user_metadata?.phone || '',
            createdAt: session.user.created_at || '',
          };
          setUser(userData);
        } else {
          setUser(null);
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
        const currentUser = session.user;
        if (currentUser) {
          const userData: User = {
            id: currentUser.id,
            email: currentUser.email || '',
            firstName: currentUser.user_metadata?.firstName || '',
            lastName: currentUser.user_metadata?.lastName || '',
            phone: currentUser.user_metadata?.phone || '',
            createdAt: currentUser.created_at || '',
          };
          setUser(userData);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      // Silently handle auth errors during initialization
      setUser(null);
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
        const userData: User = {
          id: authUser.id,
          email: authUser.email || '',
          firstName: authUser.user_metadata?.firstName || '',
          lastName: authUser.user_metadata?.lastName || '',
          phone: authUser.user_metadata?.phone || '',
          createdAt: authUser.created_at || '',
        };
        setUser(userData);
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
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    initializing,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user,
  };
};