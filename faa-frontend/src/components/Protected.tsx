'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { hasActiveSubscription } from '@/lib/types';
import { Spinner } from './Spinner';

interface ProtectedProps {
  children: React.ReactNode;
  /** When true, also requires an active subscription (default: false). */
  requireSubscription?: boolean;
  /** When true, only an administrator may access the route. */
  requireAdmin?: boolean;
}

export function Protected({ children, requireSubscription = false, requireAdmin = false }: ProtectedProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (requireAdmin && user.role !== 'admin') {
      router.replace('/');
      return;
    }
    if (requireSubscription && !hasActiveSubscription(user)) {
      router.replace('/profile');
    }
  }, [loading, user, router, requireAdmin, requireSubscription]);

  if (loading) return <Spinner label="Cargando…" />;
  if (!user) return null;
  if (requireAdmin && user.role !== 'admin') return null;
  if (requireSubscription && !hasActiveSubscription(user)) return null;
  return <>{children}</>;
}
