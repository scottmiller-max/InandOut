import { Stack } from 'expo-router';
import { AdminRouteGuard } from '@/components/AdminRouteGuard';

export default function AdminLayout() {
  return (
    <AdminRouteGuard requiredPermission="admin:access" minimumRole="admin">
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="crm" />
        <Stack.Screen name="profile" />
      </Stack>
    </AdminRouteGuard>
  );
}