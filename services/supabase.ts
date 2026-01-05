import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { getItemAsync, setItemAsync, deleteItemAsync } from 'expo-secure-store';

// Supabase configuration - Replace with your actual Supabase project details
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

// Web storage adapter using localStorage
const WebLocalStorageAdapter = {
  getItem: (key: string) => {
    if (typeof window !== 'undefined') {
      return Promise.resolve(window.localStorage.getItem(key));
    }
    return Promise.resolve(null);
  },
  setItem: (key: string, value: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, value);
    }
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key);
    }
    return Promise.resolve();
  },
};

// Native storage adapter using SecureStore
const NativeSecureStoreAdapter = {
  getItem: getItemAsync,
  setItem: setItemAsync,
  removeItem: deleteItemAsync,
};

// Choose storage adapter based on platform
const storageAdapter = Platform.OS === 'web' ? WebLocalStorageAdapter : NativeSecureStoreAdapter;

// Create Supabase client with proper configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});