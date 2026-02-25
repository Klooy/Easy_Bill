import { useEffect, useRef } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { sileo } from 'sileo';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ allowedRoles }) => {
  const { session, role, loading } = useAuthStore();
  const notified = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (!session && !notified.current) {
      sileo.warning({ title: 'Sesión expirada', description: 'Inicia sesión para continuar.' });
      notified.current = true;
    }
    if (session && allowedRoles && !allowedRoles.includes(role) && !notified.current) {
      sileo.error({ title: 'Acceso denegado', description: 'No tienes permisos para acceder a esta sección.' });
      notified.current = true;
    }
  }, [loading, session, role, allowedRoles]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    const redirectTo = role === 'admin' ? '/admin' : '/dashboard';
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
};

export { ProtectedRoute };
