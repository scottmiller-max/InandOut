import { useEffect, useState } from 'react';
import { requireRole } from '@/services/rbac';
import { useAuth } from '@/hooks/useAuth';

export function useRequireAdmin() {
  const { user } = useAuth();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setAuthorized(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    requireRole(user.id, 'master_admin')
      .then(() => setAuthorized(true))
      .catch(() => {
        requireRole(user.id, 'admin')
          .then(() => setAuthorized(true))
          .catch(() => setAuthorized(false));
      })
      .finally(() => setLoading(false));
  }, [user]);

  return { authorized, loading };
}
