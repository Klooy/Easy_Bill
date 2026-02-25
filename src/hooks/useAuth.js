import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services/auth.service';

const useAuth = () => {
  const { user, role, session, loading, setSession, clearSession, setLoading } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentSession = await authService.getSession();
        if (currentSession) {
          const currentUser = currentSession.user;
          const currentRole = authService.getRoleFromUser(currentUser);
          setSession(currentSession, currentUser, currentRole);
        } else {
          clearSession();
        }
      } catch {
        clearSession();
      }
    };

    initAuth();

    const { data: { subscription } } = authService.onAuthStateChange(
      (event, newSession) => {
        if (event === 'SIGNED_IN' && newSession) {
          const newUser = newSession.user;
          const newRole = authService.getRoleFromUser(newUser);
          setSession(newSession, newUser, newRole);
        } else if (event === 'SIGNED_OUT') {
          clearSession();
        } else if (event === 'TOKEN_REFRESHED' && newSession) {
          const newUser = newSession.user;
          const newRole = authService.getRoleFromUser(newUser);
          setSession(newSession, newUser, newRole);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [setSession, clearSession, setLoading]);

  return { user, role, session, loading };
};

export { useAuth };
