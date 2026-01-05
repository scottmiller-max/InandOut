import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { LogOut } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';

interface GlobalSignOutButtonProps {
  style?: any;
  compact?: boolean;
}

export const GlobalSignOutButton: React.FC<GlobalSignOutButtonProps> = ({ 
  style, 
  compact = false 
}) => {
  const { signOut, loading, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  if (compact) {
    return (
      <TouchableOpacity 
        style={[styles.compactButton, style]} 
        onPress={handleSignOut}
        disabled={loading}
      >
        <LogOut size={16} color="#dc2626" />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      style={[styles.signOutButton, style]} 
      onPress={handleSignOut}
      disabled={loading}
    >
      <LogOut size={16} color="#ffffff" />
      <Text style={styles.signOutText}>
        {loading ? 'Signing out...' : 'Sign Out'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  signOutButton: {
    backgroundColor: '#dc2626',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Inter-SemiBold',
    marginLeft: 6,
  },
  compactButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
});