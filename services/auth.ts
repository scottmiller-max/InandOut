import { supabase } from './supabase';
import { roleService, UserRole } from './roles';
import { validateEmail, validatePassword, getEmailValidationError, getPasswordValidationError } from './authValidation';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  createdAt: string;
  role?: UserRole;
}

export const authService = {
  // Sign up new user
  signUp: async (email: string, password: string, firstName: string, lastName: string, phone: string) => {
    try {
      const emailError = getEmailValidationError(email);
      if (emailError) {
        throw new Error(emailError);
      }

      const passwordError = getPasswordValidationError(password);
      if (passwordError) {
        throw new Error(passwordError);
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'https://app.inandoutmovin.com/auth/verified',
          data: {
            firstName,
            lastName,
            phone,
          },
        },
      });

      if (error) throw error;

      return { user: data.user, session: data.session };
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  },

  // Sign in existing user
  signIn: async (email: string, password: string) => {
    try {
      if (!validateEmail(email)) {
        throw new Error('Invalid email format');
      }

      if (!validatePassword(password)) {
        throw new Error('Password must be at least 8 characters');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password');
        }
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Please verify your email address before signing in');
        }
        throw error;
      }

      // Ensure user profile exists in users table
      if (data.user) {
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('id', data.user.id)
          .single();

        if (!existingUser) {
          // Create user profile if it doesn't exist
          const { error: profileError } = await supabase
            .from('users')
            .insert({
              id: data.user.id,
              email: data.user.email || email,
              first_name: data.user.user_metadata?.firstName || '',
              last_name: data.user.user_metadata?.lastName || '',
              phone: data.user.user_metadata?.phone || '',
            });

          if (profileError) {
            console.error('Profile creation error during sign in:', profileError);
          }
        }

        // Ensure user role exists
        const userRole = await roleService.getUserRole(data.user.id);
        if (!userRole) {
          await roleService.createUserRole(data.user.id, 'customer');
        }
      }

      return { user: data.user, session: data.session };
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  },

  // Sign out user
  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  },

  // Get current user
  getCurrentUser: async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Get session error:', error);
        return null;
      }
      const user = session?.user || null;
      return user;
    } catch (error) {
      // Silently handle auth errors during initialization
      return null;
    }
  },

  // Reset password
  resetPassword: async (email: string) => {
    try {
      const redirectUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/reset-password`
        : 'https://app.inandoutmovin.com/auth/reset-password';

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      if (error) throw error;
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  },

  // Update password
  updatePassword: async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
    } catch (error) {
      console.error('Update password error:', error);
      throw error;
    }
  },

  // Update user profile
  updateProfile: async (updates: Partial<User>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase
        .from('users')
        .update({
          first_name: updates.firstName,
          last_name: updates.lastName,
          phone: updates.phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  },
};