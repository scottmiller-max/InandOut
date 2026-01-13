import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { roleService, UserRole } from '@/services/roles';
import { AlertCircle } from 'lucide-react-native';

interface DispatcherRouteGuardProps {
  children: React.ReactNode;
  requiredPermission?: string;
}

export function DispatcherRouteGuard({
  children,
  requiredPermission
}: DispatcherRouteGuardProps) {
  const { user, loading: authLoading, initializing } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    checkAuthorization();
  }, [user, authLoading, initializing]);

  const checkAuthorization = async () => {
    if (initializing || authLoading) {
      return;
    }

    if (!user) {
      setIsAuthorized(false);
      router.replace('/');
      return;
    }

    try {
      const role = await roleService.getUserRole(user.id);
      setUserRole(role);

      if (!role) {
        setIsAuthorized(false);
        router.replace('/');
        return;
      }

      const allowedRoles: UserRole[] = ['master_admin', 'admin', 'dispatcher'];
      if (!allowedRoles.includes(role)) {
        setIsAuthorized(false);
        router.replace('/');
        return;
      }

      if (requiredPermission) {
        const hasPermission = await roleService.hasPermission(user.id, requiredPermission);
        if (!hasPermission) {
          setIsAuthorized(false);
          router.replace('/');
          return;
        }
      }

      setIsAuthorized(true);
    } catch (error) {
      console.error('Authorization check failed:', error);
      setIsAuthorized(false);
      router.replace('/');
    }
  };

  if (initializing || authLoading || isAuthorized === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Verifying dispatcher access...</Text>
      </View>
    );
  }

  if (!isAuthorized) {
    return (
      <View style={styles.errorContainer}>
        <AlertCircle size={64} color="#dc2626" />
        <Text style={styles.errorTitle}>Access Denied</Text>
        <Text style={styles.errorMessage}>
          This area is restricted to dispatchers and administrators.
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    fontFamily: 'Inter-Bold',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 24,
  },
});
